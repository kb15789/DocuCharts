export const DOCUMENTS_UPDATED_EVENT = "docucharts:documents-updated";

export function notifyDocumentsUpdated() {
  window.dispatchEvent(new Event(DOCUMENTS_UPDATED_EVENT));
}
