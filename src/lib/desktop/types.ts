type Coordinate = [number, number];

export type ComputerAction =
  | { action: "key"; text: string }
  | { action: "type"; text: string }
  | { action: "mouse_move"; coordinate: Coordinate }
  | { action: "left_click"; coordinate: Coordinate }
  | { action: "right_click"; coordinate: Coordinate }
  | { action: "double_click"; coordinate: Coordinate }
  | { action: "scroll"; coordinate: Coordinate; scroll_direction: "up" | "down"; scroll_amount: number }
  | { action: "screenshot" }
  | { action: "wait"; duration: number };

export type BashCommand =
  | { command: string }
  | { restart: true };

export type TextEditorCommand =
  | { command: "view"; path: string; view_range?: [number, number] }
  | { command: "create"; path: string; file_text: string }
  | { command: "str_replace"; path: string; old_str: string; new_str: string }
  | { command: "insert"; path: string; insert_line: number; new_str: string };
