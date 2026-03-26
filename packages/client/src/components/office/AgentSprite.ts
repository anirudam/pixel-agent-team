import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { AgentActivity } from "../../types/events";

const ACTIVITY_COLORS: Record<AgentActivity, number> = {
  idle: 0x6b7280,
  typing: 0x3b82f6,
  tool_call: 0xf59e0b,
  messaging: 0x10b981,
};

const SPRITE_SIZE = 32;
const DESK_WIDTH = 48;
const DESK_HEIGHT = 24;

export class AgentSprite {
  public container: Container;
  private body: Graphics;
  private head: Graphics;
  private desk: Graphics;
  private nameLabel: Text;
  private statusLabel: Text;
  private activity: AgentActivity = "idle";
  private animFrame = 0;

  constructor(
    public readonly agentId: string,
    public readonly name: string,
    x: number,
    y: number
  ) {
    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    // Desk
    this.desk = new Graphics()
      .rect(-DESK_WIDTH / 2, SPRITE_SIZE / 2, DESK_WIDTH, DESK_HEIGHT)
      .fill({ color: 0x8b5e3c });
    this.container.addChild(this.desk);

    // Monitor on desk
    const monitor = new Graphics()
      .rect(-10, SPRITE_SIZE / 2 - 12, 20, 14)
      .fill({ color: 0x1e293b })
      .stroke({ color: 0x475569, width: 1 })
      .rect(-2, SPRITE_SIZE / 2 + 2, 4, 4)
      .fill({ color: 0x475569 });
    this.container.addChild(monitor);

    // Head
    this.head = new Graphics()
      .circle(0, -SPRITE_SIZE / 2 + 6, 8)
      .fill({ color: 0xfbbf24 });
    this.container.addChild(this.head);

    // Body
    this.body = new Graphics();
    this.drawBody(ACTIVITY_COLORS.idle);
    this.container.addChild(this.body);

    // Name label
    const nameStyle = new TextStyle({
      fontSize: 10,
      fill: 0xffffff,
      fontFamily: "monospace",
    });
    this.nameLabel = new Text({ text: name, style: nameStyle });
    this.nameLabel.anchor.set(0.5, 0);
    this.nameLabel.y = SPRITE_SIZE / 2 + DESK_HEIGHT + 4;
    this.container.addChild(this.nameLabel);

    // Status label
    const statusStyle = new TextStyle({
      fontSize: 8,
      fill: 0x9ca3af,
      fontFamily: "monospace",
    });
    this.statusLabel = new Text({ text: "idle", style: statusStyle });
    this.statusLabel.anchor.set(0.5, 0);
    this.statusLabel.y = SPRITE_SIZE / 2 + DESK_HEIGHT + 18;
    this.container.addChild(this.statusLabel);
  }

  private drawBody(color: number): void {
    this.body.clear();
    this.body
      .rect(
        -SPRITE_SIZE / 4,
        -SPRITE_SIZE / 2 + 14,
        SPRITE_SIZE / 2,
        SPRITE_SIZE / 2
      )
      .fill({ color });
  }

  setState(activity: AgentActivity): void {
    if (this.activity === activity) return;
    this.activity = activity;
    this.animFrame = 0;
    this.drawBody(ACTIVITY_COLORS[activity]);
    this.statusLabel.text = activity;
    this.statusLabel.style.fill = ACTIVITY_COLORS[activity];
  }

  animate(delta: number): void {
    this.animFrame += delta;

    switch (this.activity) {
      case "idle":
        // Subtle breathing
        this.body.y = Math.sin(this.animFrame * 0.03) * 1.5;
        this.head.y = Math.sin(this.animFrame * 0.03) * 1.5;
        break;
      case "typing":
        // Rapid horizontal wiggle
        this.body.x = Math.sin(this.animFrame * 0.3) * 2;
        break;
      case "tool_call":
        // Pulsing scale
        {
          const scale = 1 + Math.sin(this.animFrame * 0.1) * 0.08;
          this.body.scale.set(scale);
        }
        break;
      case "messaging":
        // Bobbing up and down
        this.body.y = Math.sin(this.animFrame * 0.15) * 4;
        this.head.y = Math.sin(this.animFrame * 0.15) * 4;
        break;
    }
  }
}
