import React, { useEffect, useState } from 'react';
import { useWhatsAppStore } from '../../store/whatsappStore';
import { whatsappService } from '../../services/whatsapp';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, LogOut, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const WhatsAppConnection: React.FC = () => {
  const { connectionState, fetchConnectionStatus, isLoadingConnection } = useWhatsAppStore();
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    fetchConnectionStatus();
    
    // Polling para verificar status periodicamente se não estiver conectado
    const interval = setInterval(() => {
      if (!connectionState?.conectado) {
        fetchConnectionStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleDisconnect = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
    
    try {
      await whatsappService.disconnect();
      toast.success('WhatsApp desconectado');
      fetchConnectionStatus();
    } catch (error) {
      toast.error('Erro ao desconectar');
    }
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await whatsappService.restart();
      toast.success('Instância reiniciada');
      setTimeout(fetchConnectionStatus, 3000);
    } catch (error) {
      toast.error('Erro ao reiniciar');
    } finally {
      setIsRestarting(false);
    }
  };

  if (isLoadingConnection && !connectionState) {
    return <div className="p-8 text-center text-gray-500">Carregando status do WhatsApp...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-2xl mx-auto my-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-green-600" />
          Conexão WhatsApp
        </h2>
        
        <div className="flex gap-2">
          <button 
            onClick={handleRestart}
            disabled={isRestarting}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            title="Reiniciar Instância"
          >
            <RefreshCw className={`w-5 h-5 ${isRestarting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-8">
        {connectionState?.conectado ? (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-xl font-medium text-gray-900">WhatsApp Conectado!</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Seu WhatsApp está conectado e sincronizado. As mensagens serão recebidas e enviadas automaticamente através do CRM.
            </p>
            
            {connectionState.nome && (
              <div className="bg-gray-50 p-4 rounded-lg mt-4 inline-block">
                <p className="text-sm font-medium text-gray-700">{connectionState.nome}</p>
                <p className="text-xs text-gray-500">{connectionState.numero}</p>
              </div>
            )}

            <div className="pt-6">
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors mx-auto"
              >
                <LogOut className="w-4 h-4" />
                Desconectar
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">Escaneie o QR Code</h3>
              <p className="text-sm text-gray-500">
                Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o código abaixo.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 inline-block">
              {connectionState?.qrcode ? (
                <QRCodeSVG value={connectionState.qrcode} size={250} level="H" />
              ) : (
                <div className="w-[250px] h-[250px] bg-gray-100 flex items-center justify-center rounded-lg text-gray-400">
                  <div className="text-center">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                    <p className="text-sm">Gerando QR Code...</p>
                  </div>
                </div>
              )}
            </div>

            {connectionState?.pairingCode && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">Ou use o código de pareamento:</p>
                <code className="bg-gray-100 px-3 py-1 rounded text-lg font-mono tracking-wider">
                  {connectionState.pairingCode}
                </code>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-orange-600 bg-orange-50 px-4 py-2 rounded-md max-w-md mx-auto">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>Mantenha seu celular conectado à internet para garantir o funcionamento.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
