import { inject } from '@vercel/analytics';
import p5 from 'p5';
import './index.css';
import CONSTANTS from './constants';
import Interface from './interface';
import { setupModal } from './modal';
import Universe from './universe';

const { RUN, RING, INSPECT } = CONSTANTS;

const p5Canvas = (sketch) => {
  let width = sketch.windowWidth + 50;
  let height = sketch.windowHeight + 50;
  const cellSize = 8;

  let uni = new Universe(width, height, cellSize, sketch);
  const ui = new Interface(sketch, uni);

  sketch.setup = () => {
    const canvas = sketch.createCanvas(width, height);
    canvas.position(-50, -50);
    sketch.cursor(sketch.CROSS);
    ui.interfaceSetup('ui-controls');
  };

  sketch.draw = () => {
    sketch.frameRate(ui.slider.value());
    sketch.background('black');
    uni.render();
    uni.painter.renderCursor();
    fpsCounter();
  };

  sketch.windowResized = () => {
    width = sketch.windowWidth + 50;
    height = sketch.windowHeight + 50;
    sketch.resizeCanvas(width, height);
    uni = new Universe(width, height, cellSize, sketch);
    ui.universe = uni;
    ui.painter = uni.painter;
  };

  const fpsCounter = () => {
    sketch.push();
    sketch.fill(255);
    sketch.stroke(0);
    var fps = sketch.frameRate();
    sketch.text('FPS: ' + fps.toFixed(2), sketch.width - 80, sketch.height - 85);
    sketch.pop();
  };

  sketch.mousePressed = () => {
    switch (uni.painter.mode) {
      case INSPECT:
        console.log(uni.getCellPixel(sketch.mouseX, sketch.mouseY));
        break;
      default:
        switch (uni.painter.brush) {
          case RING:
            uni.painter.setBrush();
            break;
          default:
            uni.painter.paintCell(sketch.mouseX, sketch.mouseY);
            break;
        }
        break;
    }
  };
  sketch.mouseReleased = () => {};

  sketch.mouseDragged = () => {
    switch (uni.painter.brush) {
      case RING:
        uni.painter.setBrush();
        break;
      default:
        uni.painter.paintCell(sketch.mouseX, sketch.mouseY);
        if (uni.painter.mode === RUN) {
          uni.painter.paintCell(sketch.pmouseX, sketch.pmouseY);
        }
        break;
    }
  };

  sketch.deviceShaken = () => {
    if (uni.painter.mode === RUN) {
      uni.painter.mode = null;
      uni.clearGrid();
    } else {
      uni.painter.mode = RUN;
    }
    return false;
  };

  sketch.keyPressed = () => {
    switch (sketch.key) {
      case ' ':
        if (uni.painter.mode === RUN) {
          uni.painter.mode = null;
        } else if (uni.painter.mode === null) {
          uni.painter.mode = RUN;
        }
        break;
      case sketch.BACKSPACE:
        uni.clearGrid();
        break;
      case sketch.ENTER:
        uni.resetGridRandom();
        sketch.redraw();
        break;
    }
  };
};

// The Friendly Error System helps while developing but costs time every frame
// and re-fetches page scripts to lint them; p5 recommends disabling it in production.
p5.disableFriendlyErrors = !import.meta.env.DEV;

new p5(p5Canvas, 'sketch');
setupModal();
inject();
