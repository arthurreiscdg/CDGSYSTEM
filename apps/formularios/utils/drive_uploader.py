import os
import json
import pytz
from datetime import datetime
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google.oauth2 import service_account
from io import BytesIO
from django.conf import settings


# Carregar a chave JSON da variável de ambiente
#SERVICE_ACCOUNT_INFO = json.loads(os.getenv('GOOGLE_SERVICE_ACCOUNT'))
SERVICE_ACCOUNT_INFO = json.loads(os.getenv('GOOGLE_SERVICE_ACCOUNT'))
SCOPES = ['https://www.googleapis.com/auth/drive']
PASTA_PAI_ID = '1DnQ26i-53BGCXT_LNkrLbJ0VRfdaElRM'
EMAIL_PESSOAL = 'arthur.casadagrafica@gmail.com'

creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO, scopes=SCOPES)
service = build('drive', 'v3', credentials=creds)


def get_timestamp():
    brazil_tz = pytz.timezone('America/Sao_Paulo')
    return datetime.now(brazil_tz).strftime('%d-%m-%Y_%H-%M-%S')


def criar_pasta_drive(nome, parent_id=PASTA_PAI_ID):
    metadata = {
        'name': nome,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [parent_id]
    }
    pasta = service.files().create(body=metadata, fields='id').execute()
    service.permissions().create(fileId=pasta['id'], body={
        'type': 'user',
        'role': 'writer',
        'emailAddress': EMAIL_PESSOAL
    }, sendNotificationEmail=False).execute()
    return pasta['id']


def tornar_publico(file_id):
    service.permissions().create(fileId=file_id, body={
        'type': 'anyone',
        'role': 'reader'
    }).execute()


def upload_arquivo_drive(file_name, file_bytes, mime_type, folder_id):
    media = MediaIoBaseUpload(file_bytes, mimetype=mime_type, resumable=True)
    metadata = {
        'name': file_name,
        'parents': [folder_id]
    }
    file = service.files().create(body=metadata, media_body=media, fields='id').execute()
    tornar_publico(file['id'])
    link_download = f"https://drive.google.com/uc?id={file['id']}&export=download"
    return {
        'file_id': file['id'],
        'link_download': link_download
    }


