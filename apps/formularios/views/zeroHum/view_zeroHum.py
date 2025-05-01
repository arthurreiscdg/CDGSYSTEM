import io
import json
import pytz
import tempfile
import pandas as pd
from datetime import datetime
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import holidays
import logging
from django.contrib.auth.decorators import login_required
from ...models import Contato, Unidade, ConfiguracaoImpressao, ArquivoPDF
from ...utils.drive_uploader import get_timestamp, criar_pasta_drive, upload_arquivo_drive

# Lista de unidades válidas para processamento
UNIDADES_LISTA = [
    'ARARUAMA', 'CABO_FRIO', 'ITABORAI', 'ITAIPUACU', 'MARICA_I', 'NOVA_FRIBURGO',
    'QUEIMADOS', 'SEROPEDICA', 'ALCANTARA', 'BANGU', 'BARRA_DA_TIJUCA', 'BELFORD_ROXO',
    'DUQUE_DE_CAXIAS', 'ICARAI', 'ILHA_DO_GOVERNADOR', 'ITAIPU', 'MADUREIRA', 'MEIER',
    'NILOPOLIS', 'NITEROI', 'NOVA_IGUACU', 'OLARIA', 'PRATA', 'SAO_GONCALO',
    'SAO_JOAO_DE_MERITI', 'VILA_ISABEL', 'VILAR_DOS_TELES'
]

logger = logging.getLogger(__name__)

# Valida se todos os campos obrigatórios foram preenchidos
def validar_campos_obrigatorios(campos, arquivos=None):
    if not all(campos) or (arquivos is not None and not arquivos):
        return JsonResponse({'success': False, 'error': 'Preencha todos os campos obrigatórios.'}, status=400)
    return None

# Valida o formato da data de entrega
def validar_data(data_str):
    try:
        datetime.strptime(data_str, "%Y-%m-%d")
    except ValueError:
        return JsonResponse({'success': False, 'error': 'Data de entrega inválida. Use o formato YYYY-MM-DD.'}, status=400)
    return None

# Salva um novo contato no banco de dados
def salvar_contato(nome, email):
    return Contato.objects.create(nome=nome, email=email)

# Salva as configurações de impressão no banco
def salvar_configuracao(request, contato, titulo, data_entrega):
    return ConfiguracaoImpressao.objects.create(
        titulo=titulo,
        data_entrega=data_entrega,
        observacoes=request.POST.get('observacoes', ''),
        formato=request.POST.get('formato'),
        cor_impressao=request.POST.get('corImpressao'),
        impressao=request.POST.get('impressao'),
        gramatura=request.POST.get('gramatura'),
        papel_adesivo=request.POST.get('papelAdesivo') == 'on',
        tipo_adesivo=request.POST.get('tipoAdesivo') or None,
        grampos=request.POST.get('grampos') or None,
        espiral=request.POST.get('espiral') == 'on',
        capa_pvc=request.POST.get('capaPVC') == 'on',
        contato=contato
    )

# Gera o JSON com os dados enviados e processados
def gerar_json_info(nome_pdf, link_download, numero_arquivos, unidades_dict, configuracao, contato, timestamp, cod_op):
    dados = {
        "nomeArquivo": nome_pdf,
        "caminhoDownload": link_download,
        "caminhoSwitch": "C:/Users/CDG/OneDrive/Desktop/uploads",
        "cod_op": cod_op,
        "numeroArquivos": numero_arquivos,
        "nomeUnidade": {nome: unidades_dict.get(nome, 0) for nome in UNIDADES_LISTA},
        "dadosFormulario": {
            "titulo": configuracao.titulo,
            "dataEntrega": str(configuracao.data_entrega),
            "observacoes": configuracao.observacoes,
            "formato": configuracao.formato,
            "corImpressao": configuracao.cor_impressao,
            "impressao": configuracao.impressao,
            "gramatura": configuracao.gramatura,
            "papelAdesivo": configuracao.papel_adesivo or None,
            "tipoAdesivo": configuracao.tipo_adesivo,
            "grampos": configuracao.grampos,
            "espiral": configuracao.espiral or None,
            "capaPVC": configuracao.capa_pvc or None,
            "contato": {
                "nome": contato.nome,
                "email": contato.email
            }
        },
        "timestamp": timestamp
    }
    return dados

# Processa cada arquivo PDF, realiza o upload e salva as informações
def processar_uploads(files, folder_id, configuracao, timestamp, unidades_associadas, cod_op):
    arquivos_info = []
    unidades_dict = {u.nome: u.quantidade for u in unidades_associadas}
    contato = configuracao.contato

    for f in files:
        try:
            file_content = f.read()
            if not isinstance(file_content, bytes):
                logger.error(f"O arquivo {f.name} não foi lido corretamente")
                continue

            pdf_data = io.BytesIO(file_content)
            upload_info = upload_arquivo_drive(f.name, pdf_data, f.content_type, folder_id)
            link_download = upload_info.get('link_download')

            if not link_download:
                logger.error(f"Erro no upload do arquivo {f.name}")
                continue

            # Criar o objeto ArquivoPDF com o link de download
            arquivo_pdf = ArquivoPDF.objects.create(
                arquivo=f,
                configuracao=configuracao,
                cod_op=cod_op,
                link_download=link_download  # Salvar o link de download
            )
            arquivo_pdf.unidades.set(unidades_associadas)

            json_data = gerar_json_info(f.name, link_download, len(files), unidades_dict, configuracao, contato, timestamp, cod_op)
            json_filename = f.name.replace('.pdf', '.json')
            with tempfile.NamedTemporaryFile(mode='w+', suffix='.json', delete=False, encoding='utf-8') as temp_json:
                json.dump(json_data, temp_json, indent=4)
                json_path = temp_json.name

            with open(json_path, 'rb') as json_file:
                json_upload_info = upload_arquivo_drive(json_filename, json_file, 'application/json', folder_id)
                
            # Salvar o link do arquivo JSON
            json_link = json_upload_info.get('link_download')
            if json_link:
                arquivo_pdf.json_link = json_link
                arquivo_pdf.save()

            arquivos_info.append({
                'nome': f.name,
                'link': link_download,
                'json': {
                    'nome': json_filename,
                    'link': json_link
                }
            })

        except Exception as e:
            logger.error(f"Erro ao processar arquivo {f.name}: {str(e)}")
            continue

    return arquivos_info

def encontrar_ultimo_dia_util():
    feriados = holidays.country_holidays("BR")
    feriados_2024 = feriados["2024-01-01":"2024-12-31"]

    for feriado in feriados_2024:
        print(feriado)
    
# Endpoint para o formulário manual de upload (sem Excel)
@csrf_exempt
@login_required
def formZeroHum(request):
    # Verificar se o usuário tem permissão para acessar este formulário
    user = request.user
    if not user.is_admin_form() and user.tipo_formulario != 'zerohum':
        return redirect('exibir_formulario')
        
    if request.method == 'POST':
        try:
            titulo = request.POST.get('titulo')
            data_entrega = request.POST.get('dataEntrega')
            nome_contato = request.POST.get('nome')
            email_contato = request.POST.get('email')
            files = request.FILES.getlist('file')

            erro = validar_campos_obrigatorios([titulo, data_entrega, nome_contato, email_contato], files)
            if erro: return erro

            erro = validar_data(data_entrega)
            if erro: return erro

            timestamp = f"ZEROHUM{get_timestamp()}"
            folder_id = criar_pasta_drive(timestamp)
            contato = salvar_contato(nome_contato, email_contato)
            configuracao = salvar_configuracao(request, contato, titulo, data_entrega)

            unidades_associadas = []
            for unidade_nome in UNIDADES_LISTA:
                quantidade = request.POST.get(unidade_nome)
                if quantidade:
                    try:
                        quantidade_int = int(quantidade)
                        if quantidade_int > 0:
                            unidade_obj, _ = Unidade.objects.get_or_create(nome=unidade_nome)
                            unidade_obj.quantidade = quantidade_int
                            unidade_obj.save()
                            unidades_associadas.append(unidade_obj)
                    except Exception as e:
                        return JsonResponse({'success': False, 'error': f'Erro ao processar unidade {unidade_nome}: {str(e)}'}, status=500)

            cod_op_str = (
                'ZER' + str(configuracao.data_entrega) +
                (configuracao.formato or '') + (configuracao.cor_impressao or '') +
                (configuracao.impressao or '') + (configuracao.gramatura or '') +
                (str(configuracao.papel_adesivo) if configuracao.papel_adesivo is not None else '') +
                (configuracao.tipo_adesivo or '') + (configuracao.grampos or '') +
                (str(configuracao.espiral) if configuracao.espiral is not None else '') +
                (str(configuracao.capa_pvc) if configuracao.capa_pvc is not None else '')
            )
            cod_op = abs(hash(cod_op_str)) % 100000  # Limita o hash a 5 dígitos

            arquivos_info = processar_uploads(files, folder_id, configuracao, timestamp, unidades_associadas, cod_op)

            return JsonResponse({
                'success': True,
                'message': 'Upload concluído com sucesso!',
                'arquivos': arquivos_info
            })

        except Exception as e:
            logger.exception("Erro inesperado no formulário manual:")
            return JsonResponse({'success': False, 'error': f'Erro inesperado: {str(e)}'}, status=500)

    return render(request, 'formularios/zeroHumForm/formRapido.html')

# Endpoint para o formulário com importação via Excel
@csrf_exempt
@login_required
def formZeroHumEx(request):
    # Verificar se o usuário tem permissão para acessar este formulário
    user = request.user
    if not user.is_admin_form() and user.tipo_formulario != 'zerohum':
        return redirect('exibir_formulario')
        
    if request.method == 'POST':
        try:
            files = request.FILES.getlist('file')
            excel_file = request.FILES.get("excel_file")

            titulo = request.POST.get('titulo')
            data_entrega = request.POST.get('dataEntrega')
            nome_contato = request.POST.get('nome')
            email_contato = request.POST.get('email')

            erro = validar_campos_obrigatorios([titulo, data_entrega, nome_contato, email_contato], files)
            if erro: return erro

            if not excel_file:
                return JsonResponse({'success': False, 'error': 'Arquivo Excel ausente'}, status=400)

            erro = validar_data(data_entrega)
            if erro: return erro

            try:
                df = pd.read_excel(io.BytesIO(excel_file.read()), sheet_name='PEDIDO')
                df = df.dropna(subset=["UNIDADES"])
                df['UNIDADES'] = df['UNIDADES'].str.strip().str.upper()
            except Exception as e:
                return JsonResponse({'success': False, 'error': f'Erro ao processar Excel: {str(e)}'}, status=400)

            timestamp = f"ZEROHUM{get_timestamp()}"
            folder_id = criar_pasta_drive(timestamp)
            contato = salvar_contato(nome_contato, email_contato)
            configuracao = salvar_configuracao(request, contato, titulo, data_entrega)

            unidades_associadas = []
            for unidade_nome in UNIDADES_LISTA:
                linha = df[df['UNIDADES'] == unidade_nome]
                if not linha.empty:
                    try:
                        qtde = linha['QTDE'].values[0]
                        if pd.notna(qtde):
                            quantidade_int = int(qtde)
                            if quantidade_int > 0:
                                unidade_obj, _ = Unidade.objects.get_or_create(nome=unidade_nome)
                                unidade_obj.quantidade = quantidade_int
                                unidade_obj.save()
                                unidades_associadas.append(unidade_obj)
                    except Exception as e:
                        return JsonResponse({'success': False, 'error': f'Erro ao processar unidade {unidade_nome}: {str(e)}'}, status=500)

            cod_op = abs(hash(configuracao.titulo + str(timestamp))) % 100000  # Limita o hash a 5 dígitos
            arquivos_info = processar_uploads(files, folder_id, configuracao, timestamp, unidades_associadas, cod_op)

            return JsonResponse({
                'success': True,
                'message': 'Upload concluído com sucesso!',
                'arquivos': arquivos_info,
                'numeroArquivos': len(arquivos_info)
            })

        except Exception as e:
            logger.exception("Erro inesperado no formulário Excel:")
            return JsonResponse({'success': False, 'error': f'Erro inesperado: {str(e)}'}, status=500)

    return render(request, 'formularios/zeroHumForm/formRapidoExcel.html')
