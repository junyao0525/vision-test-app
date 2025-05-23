import { S3Client } from "@aws-sdk/client-s3";
import {
  S3_ACCESS_KEY_ID,
  S3_DOMAIN,
  S3_REGION,
  S3_SECRET_ACCESS_KEY,
} from "./config";

// if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
//   throw new Error("AWS credentials are missing");
// }

export const s3Client = new S3Client({
  forcePathStyle: true,
  region: S3_REGION,
  endpoint: S3_DOMAIN,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});
