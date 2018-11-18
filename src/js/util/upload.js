const upload = (formValues) => {
  console.log('@upload', formValues);
  // return new Promise(resolve => {
  //   setTimeout(() => {
  //     resolve();
  //   }, 2000);
  // })

  const filesToUpload = formValues.organizations[0].attachments.filter(file => !file.location)

  const body = filesToUpload[0]

  console.log(body);


  return new Promise(resolve => {
    const request = new XMLHttpRequest();
    let requestCompletedBeforeFirstProgressEvent = false;
    let requestProgressEventsFired = 0;
    console.log('UNSENT', request.status);

    console.log('OPENED', request.status);

    request.upload.addEventListener("loadstart", () => {
      console.log('load start');
    }, false);

    // request.upload.onnprogress = function (e) {
    //   console.log('@onnprogress');
    //   console.log('UPLOADING - completed: ' + (e.loaded / e.total * 100) + '%');
    // };

    // request.load = function () {
    //   console.log('DONE', request.status);)
    //   resolve();
    // };

    request.upload.addEventListener("progress", (e) => {
      if (e.loaded === e.total && requestProgressEventsFired === 0) {
        console.log('completed before first progress event');
      }
      console.log('progress', e);
    }, false);
    request.upload.addEventListener("load", () => {
      console.log('completed');
      resolve();
    }, false);

    // request.onreadystatechange = function() { // Call a function when the state changes.
    //   console.log('onreadystatechange');
    //   resolve()
    //   if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
    //       // Request finished. Do processing here.
    //   }
    // }

    request.open('POST', 'http://localhost:8080/upload-base-64', true);
    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    request.send(JSON.stringify(body));
  })

  // return fetch('http://localhost:8080/upload-base-64', {
  //   headers: {
  //     'Accept': 'application/json',
  //     'Content-Type': 'application/json'
  //   },
  //   method: 'POST',
  //   body: JSON.stringify(body[0])
  // })
  //   .then((res) => {
  //     return console.log(res);
  //   });
}

export default upload;
