import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";
import { join, dirname } from "path"; // to join the path from different locations
import * as sharp from "sharp"; // promise based library to work with images.
import { Storage } from "@google-cloud/storage";
import { tmpdir } from "os";


// admin.initializeApp();
const gcs = new Storage();
const uuid = require('uuid-v4');
// const os = require("os");
// storage functions will be triggered everytime a file is created.
// This will create an infinite loop.
// So it is highly incumbent upon us to create the logic which is triggered only once ala.. termination point.

export const resizeCourseImage = functions.storage
  .object()
  .onFinalize(async (object) => {
    console.log("Bucket Info:" + object.bucket);

    const bucket = gcs.bucket(object.bucket); // get the uploaded bucket.
    const filePath = object.name;
    const contentType = object.contentType; // File content type
    const contentDisposition = object.contentDisposition; //Content disposition
    const cacheControl = object.cacheControl;
    const contentEncoding = object.contentEncoding;
    const contentLanguage = object.contentLanguage;

    console.log("Bucket filePath:" + filePath);
    const fileName = filePath?.split("/").pop();
    console.log("Bucket fileName:" + fileName);
    // const tmpFilePath = join(tmpdir(), basename(filePath!));
    const tmpFilePath = join(tmpdir(), fileName!);
    console.log("Bucket tmpFilePath:" + tmpFilePath);
    const courseFileName = "courseImg_" + fileName;
    const tmpCardCoursePath = join(tmpdir(), courseFileName);

    
    const metadata = {
      contentType: contentType,
      contentDisposition: contentDisposition,
      cacheControl: cacheControl,
      contentEncoding: contentEncoding,
      contentLanguage: contentLanguage,
      metadata: {
        firebaseStorageDownloadTokens: uuid(),
      }

    };
    console.log("Bucket tmpCardCoursePath:" + tmpCardCoursePath);
      // This line will have a termination point for the infinite loop call.|| !object.contentType?.includes('image')
    if (fileName?.includes("courseImg_")) {
      console.log("exiting from the resize function");
      return false;
    }

    await bucket.file(filePath!).download({
      destination: tmpFilePath,
    });

    // card Image for courses.
    await sharp(tmpFilePath)
      .resize(170, 330, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .withMetadata()
      .toFile(tmpCardCoursePath)
      .then((info) => {
        console.log(info);
      })
      .catch((error) => {
        console.log(error);
      });

    // Thumb Image for courses.
    //    await sharp(tmpFilePath).resize(170, 330).toFile(tmpthumbCoursePath);

    return bucket.upload(tmpCardCoursePath, {
      // the excalamation at the end of the path is to
      destination: join(dirname(filePath!), courseFileName),
      metadata: metadata,
    });
  });
