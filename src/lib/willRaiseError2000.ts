import { ServerError } from "../types";

export default function willRaiseError2000(serverErrors: ServerError[]) {
  // If at least 2 requests to the server have failed in the last 15 seconds,
  // do not redirect in order to avoid getting an error #2000 from Twitch.
  const currentTimestamp = performance.now();
  const errors = serverErrors.filter(
    error =>
      error.statusCode === 500 && currentTimestamp - error.timestamp < 15000
  );
  return errors.length > 1;
}
