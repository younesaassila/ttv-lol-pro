// PROXYING SPECIFIC REQUESTS WORKS BY SETTING A FLAG IN THE ACCEPT HEADER.

// This flag is then caught by the `onProxyRequest` listener, which proxies
// the request, then by the `onBeforeSendHeaders` listener,
// which removes the flag.

// I tried adding a custom header, but even though it got removed by the
// `onBeforeSendHeaders` listener, it still caused the CORS preflight request
// to fail.

const acceptFlag = "TTV-LOL-PRO";

export default acceptFlag;
