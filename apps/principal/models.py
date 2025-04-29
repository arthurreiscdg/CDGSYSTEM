from django.db import models

class DocumentoPDF(models.Model):
    titulo = models.CharField(max_length=255)
    arquivo = models.FileField(upload_to='pdfs/')
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titulo
