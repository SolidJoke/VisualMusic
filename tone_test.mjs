import * as Tone from "tone";

async function test() {
  let counter = 0;
  
  // Set up a polyfill for AudioContext if needed for testing Tone in Node,
  // but Tone might not work out-of-the-box in Node. Let's see if scheduleRepeat works.
  try {
    const id1 = Tone.Transport.scheduleRepeat((time) => {
      console.log("Repeat 1", counter++);
    }, "16n");

    Tone.Transport.start();

    await new Promise(r => setTimeout(r, 100));

    Tone.Transport.cancel(); // does it cancel id1?

    const id2 = Tone.Transport.scheduleRepeat((time) => {
      console.log("Repeat 2", counter++);
    }, "16n");

    await new Promise(r => setTimeout(r, 100));
    Tone.Transport.stop();
    console.log("Done");
  } catch (e) {
    console.log("Error:", e.message);
  }
}

test();
