# Engine01 v1.0.1
import azure.functions as func
import json
import logging
import datetime
import uuid
import os
import requests


from azure.data.tables import TableServiceClient

app = func.FunctionApp()

@app.route(route="intake", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST"])
def intake(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("Intake request received.")

    # 1) Parse JSON body
    try:
        data = req.get_json()
    except ValueError:
        return func.HttpResponse(
            json.dumps({"ok": False, "error": "INVALID_JSON", "message": "Request body must be valid JSON."}),
            status_code=400,
            mimetype="application/json",
        )

    # 2) Validate required fields
    required = ["name", "email", "businessName", "projectType", "goals"]
    missing = [k for k in required if not str(data.get(k, "")).strip()]

    if missing:
        return func.HttpResponse(
            json.dumps({"ok": False, "error": "VALIDATION_ERROR", "missing": missing}),
            status_code=400,
            mimetype="application/json",
        )

    # 3) Generate tracking fields
    request_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
    created_at = datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

    # 4) Store in Azure Table Storage (store-first workflow)
    conn_str = os.environ.get("INTAKE_STORAGE_CONNECTION_STRING")
    table_name = os.environ.get("TABLE_NAME", "intakeRequests")

    if not conn_str:
        return func.HttpResponse(
            json.dumps({"ok": False, "error": "MISSING_STORAGE", "message": "INTAKE_STORAGE_CONNECTION_STRING not set."}),
            status_code=500,
            mimetype="application/json",
        )

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

    # 5) Return success
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
    )
