import { WebRequest } from "webextension-polyfill";
import clientIdFlag from "./clientIdFlag";

export default function isFlaggedRequest(
  headers: WebRequest.HttpHeaders | undefined
): boolean {
  if (!headers) return false;
  return headers.some(
    header =>
      header.name.toLowerCase() === "client-id" &&
      header.value?.includes(clientIdFlag)
  );
}
