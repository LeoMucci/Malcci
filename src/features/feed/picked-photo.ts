// Representação unificada de uma foto escolhida no formulário, para os dois mundos:
// web (objeto File do <input>) e nativo (uri + base64 do expo-image-picker).

export interface PickedPhoto {
  /** URL para pré-visualização (objectURL na web, file:// no nativo). */
  uri: string;
  /** Arquivo do <input type=file> — presente apenas na web. */
  file?: File;
  /** Conteúdo em base64 — presente apenas no nativo (vindo do image picker). */
  base64?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
}
