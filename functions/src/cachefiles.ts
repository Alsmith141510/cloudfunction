
// // import * as admin from "firebase-admin";
// import { Storage } from "@google-cloud/storage";
// export const setMetadataForFiles = async (data: any) => {
//     const bucketName = 'gs://learningapp-a273d_staticimg';

//     const storage = new Storage();

//     console.log('bucketName:::' + bucketName);

//     // Lists files in the bucket
//     const [files] = await storage.bucket(bucketName).getFiles();
//     let obj: string = '';
//     console.log('Files:');
//     files.forEach(file => {
//       console.log(file.name);
//       // file.setMetadata({
//       //   cacheControl: 'public,max-age=300000',
//       //   metadata: {
//       //     customMetadata: 'Static Images for the website'
//       //   },
//       // })
//         obj = obj + 'Updated metadata for object'+ file.name+'in bucket '+ bucketName;
//         console.log('Updated metadata for object', file.name,'in bucket ', bucketName)
//       });

//       return obj;
// }
