/// <reference lib="webworker" />

/* addEventListener('message', ({ data }) => {
  const response = `worker response to ${data}`;
  postMessage(response);
}); */
addEventListener('message', ({ data }) => {
  const { text, delay } = data;
  let index = 0;

  function sendNext() {
    if (index < text.length) {
      postMessage(text.slice(0, index + 1));
      index++;
      setTimeout(sendNext, delay);
    } else {
      postMessage('[END]');
    }
  }

  sendNext();
});
