/** Central config. Cloud Functions injects most of this automatically. */
export const config = {
  region: 'europe-west1',          // close to Uganda, cheaper than us-central
  apiPrefix: '/api/v1',
  pageSizeDefault: 20,
  pageSizeMax: 50,
};
