/**
 * Utilitário para cálculo de hash SHA-256 de imagens no cliente
 * Usado na detecção anti-duplicata antes de envio para o Supabase Storage.
 */
export async function calculateImageHash(fileOrBlob: Blob): Promise<string> {
  try {
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('Falha ao calcular hash SHA-256 da imagem:', err);
    return '';
  }
}
