# Engine01 v1.0.2
import azure.functions as func
import json
import logging
import datetime
import uuid
import os
import requests
from azure.data.tables import TableServiceClient

app = func.FunctionApp()

@app.route(route="intake", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST", "OPTIONS"])
def intake(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("Intake request received.")

    # Define the CORS headers to be used in every single response
    cors_headers = {
        "Access-Control-Allow-Origin": "https://ianmingcloud.com",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "3600"
    }

    # 1. Handle the "Preflight" check immediately
    # This is what the browser sends BEFORE the actual data
    if req.method == "OPTIONS":
        return func.HttpResponse(
            status_code=204,
            headers=cors_headers
        )

    # 2) Parse JSON body
    try:
        data = req.get_json()
    except ValueError:
        return func.HttpResponse(
            json.dumps({"ok": False, "error": "INVALID_JSON", "message": "Request body must be valid JSON."}),
            status_code=400,
            mimetype="application/json",
            headers=cors_headers
        )

    # 3) Validate required fields
    required = ["name", "email", "businessName", "projectType", "goals"]
    missing = [k for k in required if not str(data.get(k, "")).strip()]

    if missing:
        return func.HttpResponse(
            json.dumps({"ok": False, "error": "VALIDATION_ERROR", "missing": missing}),
            status_code=400,
            mimetype="application/json",
            headers=cors_headers
        )

    # 4) Generate tracking fields
    request_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
    created_at = datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

    # 5) Store in Azure Table Storage (store-first workflow)
    conn_str = os.environ.get("INTAKE_STORAGE_CONNECTION_STRING")
    table_name = os.environ.get("TABLE_NAME", "intakeRequests")

    if not conn_str:
        return func.HttpResponse(
            json.dumps({"ok": False, "error": "MISSING_STORAGE", "message": "INTAKE_STORAGE_CONNECTION_STRING not set."}),
            status_code=500,
            mimetype="application/json",
            headers=cors_headers
        )

    try:
        service = TableServiceClient.from_connection_string(conn_str)
        table = service.create_table_if_not_exists(table_name)

        entity = {
            "PartitionKey": "intake",
            "RowKey": request_id,
            "createdAt": created_at,
            "status": "new",
            "name": data["name"],
            "email": data["email"],
            "businessName": data["businessName"],
            "projectType": data["projectType"],
            "goals": data["goals"],
        }

        table.create_entity(entity=entity)
    except Exception as e:
        logging.error(f"Storage error: {str(e)}")
        # Continue to Trello even if storage fails, or return error here

    # --- Trello Integration ---
    trello_key = os.environ.get("TRELLO_KEY")
    trello_token = os.environ.get("TRELLO_TOKEN")
    trello_list_id = os.environ.get("TRELLO_LIST_ID")

    if trello_key and trello_token and trello_list_id:
        try:
            trello_url = "https://api.trello.com/1/cards"
            card_data = {
                'key': trello_key,
                'token': trello_token,
                'idList': trello_list_id,
                'name': f"New Lead: {data['name']} | {data['projectType']}",
                'desc': (
                    f"--- SOURCE: Portfolio Site ---\n"
                    f"Business: {data['businessName']}\n"
                    f"Email: {data['email']}\n"
                    f"Goals: {data['goals']}\n"
                    f"Request ID: {request_id}"
                ),
            }
            requests.post(trello_url, params=card_data)
            logging.info(f"Trello card created for {request_id}")
        except Exception as e:
            logging.error(f"Failed to create Trello card: {str(e)}")

    # --------------------------

    # 6) Return success with the required CORS headers
    return func.HttpResponse(
        json.dumps(
            {
                "ok": True,
                "requestId": request_id,
                "createdAt": created_at,
                "stored": True,
                "message": "Request stored. Next step is notification.",
            }
        ),
        status_code=200,
        mimetype="application/json",
        headers=cors_headers
    )