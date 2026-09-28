import { Router } from 'express';
import { createDocumentQuotesLocalRouter } from './documents-quotes-local.ts';
import { createDocumentExportsLocalRouter } from './documents-exports-local.ts';
import { createDocumentPdfsLocalRouter } from './documents-pdfs-local.ts';
import { createDocumentSharingLocalRouter } from './documents-sharing-local.ts';

export function createDocumentsLocalRouter(deps: any) {
  const router = Router();
  router.use(createDocumentQuotesLocalRouter(deps));
  router.use(createDocumentExportsLocalRouter(deps));
  router.use(createDocumentPdfsLocalRouter(deps));
  router.use(createDocumentSharingLocalRouter(deps));
  return router;
}
