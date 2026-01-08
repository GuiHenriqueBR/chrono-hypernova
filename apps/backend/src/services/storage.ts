import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export type BucketName = 'documentos' | 'importacoes' | 'whatsapp-media';

export interface UploadResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
}

export interface FileMetadata {
  originalName: string;
  mimeType: string;
  size: number;
}

/**
 * Upload de arquivo para o Supabase Storage
 */
export async function uploadFile(
  bucket: BucketName,
  file: Buffer,
  metadata: FileMetadata,
  folder?: string
): Promise<UploadResult> {
  try {
    // Gerar nome unico para o arquivo
    const extension = metadata.originalName.split('.').pop() || '';
    const uniqueName = `${uuidv4()}.${extension}`;
    const path = folder ? `${folder}/${uniqueName}` : uniqueName;

    const { data, error } = await supabase.storage
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
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      path: data.path,
      url: urlData.publicUrl
    };
  } catch (error) {
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
export async function uploadSinistroDocumento(
  sinistroId: string,
  file: Buffer,
  metadata: FileMetadata
): Promise<UploadResult> {
  return uploadFile('documentos', file, metadata, `sinistros/${sinistroId}`);
}

/**
 * Upload de arquivo para documentos de apolice
 */
export async function uploadApoliceDocumento(
  apoliceId: string,
  file: Buffer,
  metadata: FileMetadata
): Promise<UploadResult> {
  return uploadFile('documentos', file, metadata, `apolices/${apoliceId}`);
}

/**
 * Upload de arquivo para documentos de cliente
 */
export async function uploadClienteDocumento(
  clienteId: string,
  file: Buffer,
  metadata: FileMetadata
): Promise<UploadResult> {
  return uploadFile('documentos', file, metadata, `clientes/${clienteId}`);
}

/**
 * Upload de arquivo de importacao (Excel/CSV)
 */
export async function uploadImportacao(
  userId: string,
  file: Buffer,
  metadata: FileMetadata
): Promise<UploadResult> {
  return uploadFile('importacoes', file, metadata, `users/${userId}`);
}

/**
 * Upload de media do WhatsApp
 */
export async function uploadWhatsAppMedia(
  conversaId: string,
  file: Buffer,
  metadata: FileMetadata
): Promise<UploadResult> {
  return uploadFile('whatsapp-media', file, metadata, `conversas/${conversaId}`);
}

/**
 * Deletar arquivo do storage
 */
export async function deleteFile(bucket: BucketName, path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Erro ao deletar arquivo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    return false;
  }
}

/**
 * Obter URL assinada (para arquivos privados)
 */
export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Erro ao gerar URL assinada:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Erro ao gerar URL assinada:', error);
    return null;
  }
}

/**
 * Listar arquivos em uma pasta
 */
export async function listFiles(bucket: BucketName, folder: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder);

    if (error) {
      console.error('Erro ao listar arquivos:', error);
      return [];
    }

    return data.map(file => `${folder}/${file.name}`);
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
    return [];
  }
}
