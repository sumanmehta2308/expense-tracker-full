import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function uploadToS3(data, filename) {
  const bucketName = process.env.AWS_BUCKET_NAME;
  const region = process.env.AWS_REGION || "ap-south-1";

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    Body: data,
    ContentType: "text/csv; charset=utf-8",
    ACL: "public-read",
  });

  await s3Client.send(command);

  return `https://${bucketName}.s3.${region}.amazonaws.com/${filename}`;
}
