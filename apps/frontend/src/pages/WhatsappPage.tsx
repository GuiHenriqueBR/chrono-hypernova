import { WhatsappConnect } from '../components/whatsapp/WhatsappConnect';

export const WhatsappPage = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Gerenciamento do WhatsApp</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <WhatsappConnect />
        
        {/* Placeholder for future components like message history or settings */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-xl font-semibold mb-4">Instruções</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Abra o WhatsApp no seu celular</li>
            <li>Toque em Menu (Android) ou Configurações (iPhone)</li>
            <li>Selecione Dispositivos Conectados</li>
            <li>Toque em Conectar um dispositivo</li>
            <li>Aponte a câmera para o QR Code ao lado</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
