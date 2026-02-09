# Engine01 v1.0.3 - THE OVERRIDE
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
    
    # We use '*' here because the Free Tier Portal is blocking our domain settings
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "3600"
    }

    # 1. Immediate Preflight Return
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=cors_headers)

    try:
        # 2. Parse Data
        try:
            data = req.get_json()
        except ValueError:
            return func.HttpResponse("Invalid JSON", status_code=400, headers=cors_headers)

        # 3. Generate IDs
        request_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
        created_at = datetime.datetime.utcnow().isoformat() + "Z"

        # 4. Storage Logic
        conn_str = os.environ.get("INTAKE_STORAGE_CONNECTION_STRING")
        if conn_str:
            service = TableServiceClient.from_connection_string(conn_str)
            table = service.create_table_if_not_exists(os.environ.get("TABLE_NAME", "intakeRequests"))
            entity = {
                "PartitionKey": "intake",
                "RowKey": request_id,
                "name": data.get("name"),
                "email": data.get("email"),
                "businessName": data.get("businessName"),
                "projectType": data.get("projectType"),
                "goals": data.get("goals")
            }
            table.create_entity(entity=entity)

        # 5. Trello Logic
        t_key = os.environ.get("TRELLO_KEY")
        t_token = os.environ.get("TRELLO_TOKEN")
        t_list = os.environ.get("TRELLO_LIST_ID")
        
        if t_key and t_token and t_list:
            requests.post("https://api.trello.com/1/cards", params={
                'key': t_key, 'token': t_token, 'idList': t_list,
                'name': f"Lead: {data.get('name')}",
                'desc': f"Email: {data.get('email')}\nID: {request_id}"
            })

        # 6. SUCCESS RESPONSE
        return func.HttpResponse(
            json.dumps({"ok": True, "requestId": request_id}),
            status_code=200,
            mimetype="application/json",
            headers=cors_headers
        )

    except Exception as e:
        logging.error(f"Error: {str(e)}")
        return func.HttpResponse("Server Error", status_code=500, headers=cors_headers)