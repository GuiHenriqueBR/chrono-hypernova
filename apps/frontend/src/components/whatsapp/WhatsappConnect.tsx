import { useEffect, useState } from 'react';
import axios from 'axios';

export const WhatsappConnect = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [loading, setLoading] = useState(false);

  const fetchQrCode = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/whatsapp/qr');
      setQrCode(response.data.qr);
      setStatus(response.data.status);
    } catch (error) {
      console.error('Error fetching QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQrCode();
    
    const interval = setInterval(() => {
        if (status !== 'connected') {
            fetchQrCode();
        }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Conectar WhatsApp</h2>
      
      {status === 'connected' ? (
        <div className="text-green-600 font-semibold">
          WhatsApp Conectado com Sucesso!
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <p className="mb-4 text-gray-600">Escaneie o QR Code abaixo com o seu WhatsApp:</p>
          
          {loading && !qrCode ? (
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-slate-200 h-10 w-10"></div>
              <div className="flex-1 space-y-6 py-1">
                <div className="h-2 bg-slate-200 rounded"></div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                    <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                  </div>
                  <div className="h-2 bg-slate-200 rounded"></div>
                </div>
              </div>
            </div>
          ) : qrCode ? (
            <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 border-2 border-gray-200 rounded-lg" />
          ) : (
            <div className="text-red-500">Falha ao carregar QR Code</div>
          )}
          
          <div className="mt-4 text-sm text-gray-500">
            Status: <span className="font-medium capitalize">{status}</span>
          </div>
          
          <button 
            onClick={fetchQrCode}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Atualizar QR Code
          </button>
        </div>
      )}
    </div>
  );
};
