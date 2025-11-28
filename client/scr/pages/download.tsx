import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileArchive, Monitor, CheckCircle } from "lucide-react";

export default function DownloadPage() {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/natus-vincere-desktop-windows-11-complete.tar.gz';
    link.download = 'natus-vincere-desktop-windows-11-complete.tar.gz';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Download - Gestão Clube Esportiva</h1>
        <p className="text-muted-foreground">
          Baixe a versão desktop para Windows 11 do sistema de gestão da academia.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Download Principal */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Monitor className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="text-xl font-semibold">Windows 11 Desktop</h3>
                <p className="text-sm text-muted-foreground">Aplicação nativa para Windows</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileArchive className="h-4 w-4" />
              <span>Tamanho: ~25KB (pacote completo)</span>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Recursos incluídos:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Aplicação Electron completa
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Scripts de inicialização automática
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  DATABASE_SETUP.md - Configuração completa da base de dados
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  WINDOWS_INSTALLER.md - Manual do usuário Windows 11
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  DEPLOYMENT.md - Guia de implementação
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  INSTALLATION.md - Instruções de instalação
                </li>
              </ul>
            </div>

            <Button onClick={handleDownload} className="w-full" size="lg">
              <Download className="h-4 w-4 mr-2" />
              Baixar Windows 11
            </Button>
          </CardContent>
        </Card>

        {/* Instruções de Instalação */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Instruções de Instalação</h3>
            <CardDescription>
              Siga estes passos para instalar e configurar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Baixar e Descompactar</p>
                  <p className="text-sm text-muted-foreground">
                    Descompacte o arquivo em uma pasta no Windows 11
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Configurar Base de Dados</p>
                  <p className="text-sm text-muted-foreground">
                    Consulte DATABASE_SETUP.md para configurar online
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Executar Aplicação</p>
                  <p className="text-sm text-muted-foreground">
                    Execute start.bat para iniciar o sistema
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Requisitos do Sistema</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Windows 11 ou superior</li>
                <li>• 4GB RAM mínimo</li>
                <li>• Conexão com internet</li>
                <li>• Base de dados online configurada</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documentação Adicional */}
      <Card className="mt-6">
        <CardHeader>
          <h3 className="text-xl font-semibold">Documentação e Suporte</h3>
          <CardDescription>
            Recursos adicionais para instalação e configuração
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-medium mb-2">DATABASE_SETUP.md</h4>
              <p className="text-sm text-muted-foreground">
                Configuração completa para Neon, Supabase, Railway e Render
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-medium mb-2">WINDOWS_INSTALLER.md</h4>
              <p className="text-sm text-muted-foreground">
                Manual completo do usuário Windows 11
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-medium mb-2">INSTALLATION.md</h4>
              <p className="text-sm text-muted-foreground">
                Guia detalhado de instalação e configuração
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações de Versão */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>Gestão Clube Esportiva Desktop v1.0.0 - Sistema completo de gestão de academia de futebol</p>
        <p>Desenvolvido para Windows 11 com tecnologia Electron</p>
      </div>
    </div>
  );
}