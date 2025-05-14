import os
import shutil
import time

# Diretório principal dos webhooks
WEBHOOK_DIR = os.path.dirname(os.path.abspath(__file__))

# Caminho dos arquivos
ORIGINAL_VIEWS = os.path.join(WEBHOOK_DIR, 'views.py')
REFACTORED_VIEWS = os.path.join(WEBHOOK_DIR, 'views_refactor.py')
ORIGINAL_URLS = os.path.join(WEBHOOK_DIR, 'urls.py')
REFACTORED_URLS = os.path.join(WEBHOOK_DIR, 'urls_refactor.py')

# Backup dos arquivos originais
BACKUP_DIR = os.path.join(WEBHOOK_DIR, 'backup')
os.makedirs(BACKUP_DIR, exist_ok=True)

TIMESTAMP = time.strftime("%Y%m%d-%H%M%S")

def backup_files():
    """Faz backup dos arquivos originais"""
    if os.path.exists(ORIGINAL_VIEWS):
        backup_name = f'views.py.{TIMESTAMP}'
        print(f"Fazendo backup de views.py para {backup_name}")
        shutil.copy2(ORIGINAL_VIEWS, os.path.join(BACKUP_DIR, backup_name))

    if os.path.exists(ORIGINAL_URLS):
        backup_name = f'urls.py.{TIMESTAMP}'
        print(f"Fazendo backup de urls.py para {backup_name}")
        shutil.copy2(ORIGINAL_URLS, os.path.join(BACKUP_DIR, backup_name))

def replace_files():
    """Substitui os arquivos originais pelos refatorados"""
    if os.path.exists(REFACTORED_VIEWS):
        print("Substituindo views.py pelo arquivo refatorado...")
        shutil.copy2(REFACTORED_VIEWS, ORIGINAL_VIEWS)
        print("Arquivo views.py substituído com sucesso.")
    else:
        print("ERRO: views_refactor.py não encontrado!")

    if os.path.exists(REFACTORED_URLS):
        print("Substituindo urls.py pelo arquivo refatorado...")
        shutil.copy2(REFACTORED_URLS, ORIGINAL_URLS)
        print("Arquivo urls.py substituído com sucesso.")
    else:
        print("ERRO: urls_refactor.py não encontrado!")

if __name__ == "__main__":
    try:
        print("Iniciando processo de atualização dos arquivos de webhook...")
        backup_files()
        replace_files()
        print("\nProcesso concluído com sucesso!")
        print(f"Os arquivos originais foram salvos no diretório: {BACKUP_DIR}")
        print("\nREINICIE O SERVIDOR PARA APLICAR AS MUDANÇAS")
    except Exception as e:
        print(f"ERRO: {str(e)}")
        print("Algo deu errado. Verifique os logs e tente novamente.")
