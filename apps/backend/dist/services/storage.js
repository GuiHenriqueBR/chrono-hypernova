"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
exports.uploadSinistroDocumento = uploadSinistroDocumento;
exports.uploadApoliceDocumento = uploadApoliceDocumento;
exports.uploadClienteDocumento = uploadClienteDocumento;
exports.uploadImportacao = uploadImportacao;
exports.uploadWhatsAppMedia = uploadWhatsAppMedia;
exports.deleteFile = deleteFile;
exports.getSignedUrl = getSignedUrl;
exports.listFiles = listFiles;
const supabase_1 = require("./supabase");
const uuid_1 = require("uuid");
/**
 * Upload de arquivo para o Supabase Storage
 */
async function uploadFile(bucket, file, metadata, folder) {
    try {
        // Gerar nome unico para o arquivo
        const extension = metadata.originalName.split('.').pop() || '';
        const uniqueName = `${(0, uuid_1.v4)()}.${extension}`;
        const path = folder ? `${folder}/${uniqueName}` : uniqueName;
        const { data, error } = await supabase_1.supabase.storage
            .from(bucket)
            .upload(path, file, {
            contentType: metadata.mimeType,
            cacheControl: '3600',
            upsert: false
        });
        if (error) {
            console.error('Erro no upload:', error);
            return { success: false, error: error.message };
        }
        // Obter URL publica ou assinada
        const { data: urlData } = supabase_1.supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);
        return {
            success: true,
            path: data.path,
            url: urlData.publicUrl
        };
    }
    catch (error) {
        console.error('Erro no upload:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido no upload'
        };
    }
}
/**
 * Upload de arquivo para documentos de sinistro
 */
async function uploadSinistroDocumento(sinistroId, file, metadata) {
    return uploadFile('documentos', file, metadata, `sinistros/${sinistroId}`);
}
/**
 * Upload de arquivo para documentos de apolice
 */
async function uploadApoliceDocumento(apoliceId, file, metadata) {
    return uploadFile('documentos', file, metadata, `apolices/${apoliceId}`);
}
/**
 * Upload de arquivo para documentos de cliente
 */
async function uploadClienteDocumento(clienteId, file, metadata) {
    return uploadFile('documentos', file, metadata, `clientes/${clienteId}`);
}
/**
 * Upload de arquivo de importacao (Excel/CSV)
 */
async function uploadImportacao(userId, file, metadata) {
    return uploadFile('importacoes', file, metadata, `users/${userId}`);
}
/**
 * Upload de media do WhatsApp
 */
async function uploadWhatsAppMedia(conversaId, file, metadata) {
    return uploadFile('whatsapp-media', file, metadata, `conversas/${conversaId}`);
}
/**
 * Deletar arquivo do storage
 */
async function deleteFile(bucket, path) {
    try {
        const { error } = await supabase_1.supabase.storage
            .from(bucket)
            .remove([path]);
        if (error) {
            console.error('Erro ao deletar arquivo:', error);
            return false;
        }
        return true;
    }
    catch (error) {
        console.error('Erro ao deletar arquivo:', error);
        return false;
    }
}
/**
 * Obter URL assinada (para arquivos privados)
 */
async function getSignedUrl(bucket, path, expiresIn = 3600) {
    try {
        const { data, error } = await supabase_1.supabase.storage
            .from(bucket)
            .createSignedUrl(path, expiresIn);
        if (error) {
            console.error('Erro ao gerar URL assinada:', error);
            return null;
        }
        return data.signedUrl;
    }
    catch (error) {
        console.error('Erro ao gerar URL assinada:', error);
        return null;
    }
}
/**
 * Listar arquivos em uma pasta
 */
async function listFiles(bucket, folder) {
    try {
        const { data, error } = await supabase_1.supabase.storage
            .from(bucket)
            .list(folder);
        if (error) {
            console.error('Erro ao listar arquivos:', error);
            return [];
        }
        return data.map(file => `${folder}/${file.name}`);
    }
    catch (error) {
        console.error('Erro ao listar arquivos:', error);
        return [];
    }
}
