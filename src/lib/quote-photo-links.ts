import { prisma } from "@/lib/prisma";

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

export interface ValidateQuotePhotoSelectionsInput {
  serviceRequestId: string;
  jobId?: string | null;
  requestPhotoIds?: string[];
  jobPhotoIds?: string[];
}

export async function validateQuotePhotoSelections({
  serviceRequestId,
  jobId,
  requestPhotoIds = [],
  jobPhotoIds = [],
}: ValidateQuotePhotoSelectionsInput) {
  const normalizedRequestPhotoIds = uniqueIds(requestPhotoIds);
  const normalizedJobPhotoIds = uniqueIds(jobPhotoIds);

  if (normalizedJobPhotoIds.length > 0 && !jobId) {
    throw new Error("Job photo links require a job context.");
  }

  const [requestPhotos, jobPhotos] = await Promise.all([
    normalizedRequestPhotoIds.length === 0
      ? Promise.resolve([])
      : prisma.photo.findMany({
          where: {
            id: { in: normalizedRequestPhotoIds },
            serviceRequestId,
          },
          select: { id: true },
        }),
    normalizedJobPhotoIds.length === 0 || !jobId
      ? Promise.resolve([])
      : prisma.jobPhoto.findMany({
          where: {
            id: { in: normalizedJobPhotoIds },
            jobId,
          },
          select: { id: true },
        }),
  ]);

  const missingRequestPhotoIds = normalizedRequestPhotoIds.filter(
    (photoId) => !requestPhotos.some((photo) => photo.id === photoId)
  );
  const missingJobPhotoIds = normalizedJobPhotoIds.filter(
    (photoId) => !jobPhotos.some((photo) => photo.id === photoId)
  );

  if (missingRequestPhotoIds.length > 0 || missingJobPhotoIds.length > 0) {
    throw new Error("One or more selected quote photos are invalid.");
  }

  return {
    requestPhotoIds: normalizedRequestPhotoIds,
    jobPhotoIds: normalizedJobPhotoIds,
  };
}
