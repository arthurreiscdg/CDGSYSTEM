import os
import json
import pytz
import logging
import time
import random
from datetime import datetime
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from googleapiclient.errors import HttpError
from google.oauth2 import service_account
from io import BytesIO
from django.conf import settings

logger = logging.getLogger(__name__)

# Configuração para retry
MAX_RETRIES = 5  # Número máximo de tentativas
RETRY_STATUSES = [429, 500, 502, 503, 504]  # Status codes que devem ser tentados novamente

# Função para executar uma operação com retry
def execute_with_retry(operation, *args, **kwargs):
    for attempt in range(MAX_RETRIES):
        try:
            return operation(*args, **kwargs)
        except HttpError as e:
            status = e.resp.status
            if status in RETRY_STATUSES and attempt < MAX_RETRIES - 1:
                # Backoff exponencial com jitter para evitar sincronização de múltiplas requisições
                sleep_time = (2 ** attempt) + random.random()
                logger.warning(f"Tentativa {attempt+1} falhou com status {status}. Tentando novamente em {sleep_time:.1f} segundos...")
                time.sleep(sleep_time)
            else:
                logger.error(f"Erro persistente após {attempt+1} tentativas: {str(e)}")
                raise
        except Exception as e:
            logger.error(f"Erro não relacionado ao HTTP: {str(e)}")
            raise

# Carregar a chave JSON da variável de ambiente
try:
    google_credentials = os.getenv('GOOGLE_SERVICE_ACCOUNT')
    if not google_credentials:
        logger.error("Variável de ambiente GOOGLE_SERVICE_ACCOUNT não encontrada.")
        raise ValueError("Credenciais do Google Drive não encontradas.")
    
    SERVICE_ACCOUNT_INFO = json.loads(google_credentials)
    logger.info("Credenciais do Google Drive carregadas com sucesso.")
except json.JSONDecodeError as e:
    logger.error(f"Erro ao decodificar JSON das credenciais: {str(e)}")
    raise
except Exception as e:
    logger.error(f"Erro ao carregar credenciais do Google Drive: {str(e)}")
    raise

SCOPES = ['https://www.googleapis.com/auth/drive']
PASTA_PAI_ID = '1DnQ26i-53BGCXT_LNkrLbJ0VRfdaElRM'
EMAIL_PESSOAL = 'arthur.casadagrafica@gmail.com'

try:
    creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO, scopes=SCOPES)
    service = build('drive', 'v3', credentials=creds)
    logger.info("Conexão com a API do Google Drive estabelecida com sucesso.")
except Exception as e:
    logger.error(f"Erro ao estabelecer conexão com o Google Drive: {str(e)}")
    raise

def get_timestamp():
    brazil_tz = pytz.timezone('America/Sao_Paulo')
    return datetime.now(brazil_tz).strftime('%d-%m-%Y_%H-%M-%S')


def criar_pasta_drive(nome, parent_id=PASTA_PAI_ID):
    try:
        metadata = {
            'name': nome,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_id]
        }
        
        # Usando retry para a criação da pasta
        pasta = execute_with_retry(
            service.files().create(body=metadata, fields='id').execute
        )
        
        # Usando retry para configurar permissões
        execute_with_retry(
            service.permissions().create(
                fileId=pasta['id'], 
                body={
                    'type': 'user',
                    'role': 'writer',
                    'emailAddress': EMAIL_PESSOAL
                }, 
                sendNotificationEmail=False
            ).execute
        )
        
        logger.info(f"Pasta criada com sucesso no Drive: {nome}")
        return pasta['id']
    except Exception as e:
        logger.error(f"Erro ao criar pasta no Drive: {str(e)}")
        raise


def tornar_publico(file_id):
    try:
        # Usando retry para configurar permissões públicas
        execute_with_retry(
            service.permissions().create(
                fileId=file_id, 
                body={
                    'type': 'anyone',
                    'role': 'reader'
                }
            ).execute
        )
        logger.info(f"Arquivo {file_id} tornado público com sucesso")
    except Exception as e:
        logger.error(f"Erro ao tornar arquivo público: {str(e)}")
        raise


def upload_arquivo_drive(file_name, file_bytes, mime_type, folder_id):
    try:
        media = MediaIoBaseUpload(file_bytes, mimetype=mime_type, resumable=True)
        metadata = {
            'name': file_name,
            'parents': [folder_id]
        }
        
        # Usando retry para upload de arquivo
        file = execute_with_retry(
            service.files().create(body=metadata, media_body=media, fields='id').execute
        )
        
        tornar_publico(file['id'])
        link_download = f"https://drive.google.com/uc?id={file['id']}&export=download"
        logger.info(f"Arquivo {file_name} carregado com sucesso")
        return {
            'file_id': file['id'],
            'link_download': link_download
        }
    except Exception as e:
        logger.error(f"Erro ao fazer upload do arquivo {file_name}: {str(e)}")
        raise


