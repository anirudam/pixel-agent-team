import { Container, Graphics, Text, TextStyle } from "pixi.js";

const BUBBLE_MAX_WIDTH = 150;
const BUBBLE_PADDING = 6;
const BUBBLE_DURATION_MS = 4000;

export class MessageBubble {
  public container: Container;
  private createdAt: number;

  constructor(message: string, x: number, y: number) {
    this.container = new Container();
    this.container.x = x;
    this.container.y = y - 40;
    this.createdAt = Date.now();

    const truncated =
      message.length > 60 ? message.slice(0, 57) + "..." : message;

    const textStyle = new TextStyle({
      fontSize: 9,
      fill: 0x1f2937,
      fontFamily: "monospace",
      wordWrap: true,
      wordWrapWidth: BUBBLE_MAX_WIDTH - BUBBLE_PADDING * 2,
    });

    const text = new Text({ text: truncated, style: textStyle });
    text.x = BUBBLE_PADDING;
    text.y = BUBBLE_PADDING;

    const bubbleWidth = Math.min(text.width + BUBBLE_PADDING * 2, BUBBLE_MAX_WIDTH);
    const bubbleHeight = text.height + BUBBLE_PADDING * 2;

    const bg = new Graphics()
      .roundRect(0, 0, bubbleWidth, bubbleHeight, 6)
      .fill({ color: 0xf3f4f6 })
      .stroke({ color: 0xd1d5db, width: 1 });

    this.container.addChild(bg);
    this.container.addChild(text);

    // Center the bubble
    this.container.pivot.x = bubbleWidth / 2;
  }

  isExpired(): boolean {
    return Date.now() - this.createdAt > BUBBLE_DURATION_MS;
  }

  animate(): void {
    const age = Date.now() - this.createdAt;
    if (age > BUBBLE_DURATION_MS - 1000) {
      this.container.alpha = Math.max(
        0,
        (BUBBLE_DURATION_MS - age) / 1000
      );
    }
  }
}
