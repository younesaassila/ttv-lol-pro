import { WebRequest } from "webextension-polyfill";
import acceptFlag from "./acceptFlag";

export default function isFlaggedRequest(
  headers: WebRequest.HttpHeaders | undefined
): boolean {
  if (!headers) return false;
  return headers.some(
    header =>
      header.name.toLowerCase() === "accept" &&
      header.value?.includes(acceptFlag)
  );
}
