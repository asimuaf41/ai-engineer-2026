// A tiny markdown renderer for streamed answers (no dependency). Examples (input -> what renders):
// 1. "Hello **world**"         -> one paragraph, "world" in bold
// 2. "- a\n- b"                -> two bullet rows: "• a" and "• b"
// 3. "1. one\n2. two"           -> two numbered rows: "1." and "2."
// 4. "Run `npm i` now"         -> "npm i" in a monospace font
// 5. "```\nconst x = 1\n```"    -> a monospace block (also while the closing ``` has not arrived yet)
// An unclosed "**bold" stays plain text until its closing ** arrives, so streaming doesn't flicker.
import { Text, View } from "react-native";

type Block =
  | { kind: "p"; text: string }
  | { kind: "li"; marker: string; text: string }
  | { kind: "code"; text: string };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  let code: string[] | null = null;
  for (const line of source.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      if (code) blocks.push({ kind: "code", text: code.join("\n") });
      code = code ? null : [];
    } else if (code) {
      code.push(line);
    } else if (line.trim() !== "") {
      const item = /^\s*(?:([-*])|(\d+)\.)\s+(.*)$/.exec(line);
      const last = blocks[blocks.length - 1];
      if (item) blocks.push({ kind: "li", marker: item[1] ? "•" : `${item[2]}.`, text: item[3] ?? "" });
      else if (last?.kind === "p") last.text += `\n${line}`;
      else blocks.push({ kind: "p", text: line });
    }
  }
  if (code) blocks.push({ kind: "code", text: code.join("\n") }); // the fence is still open while streaming
  return blocks;
}

function Inline({ text }: { text: string }) {
  return text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/).map((piece, index) =>
    piece.length > 4 && piece.startsWith("**") && piece.endsWith("**") ? (
      <Text key={index} className="font-bold">
        {piece.slice(2, -2)}
      </Text>
    ) : piece.length > 2 && piece.startsWith("`") && piece.endsWith("`") ? (
      <Text key={index} className="font-mono text-sm">
        {piece.slice(1, -1)}
      </Text>
    ) : (
      piece
    ),
  );
}

export function MarkdownLite({ text }: { text: string }) {
  return (
    <View className="gap-2">
      {parse(text).map((block, index) =>
        block.kind === "code" ? (
          <View key={index} className="rounded-lg bg-muted p-3">
            <Text selectable className="font-mono text-xs text-foreground">
              {block.text}
            </Text>
          </View>
        ) : block.kind === "li" ? (
          <View key={index} className="flex-row gap-2 pl-1">
            <Text className="text-base text-foreground">{block.marker}</Text>
            <Text selectable className="flex-1 text-base text-foreground">
              <Inline text={block.text} />
            </Text>
          </View>
        ) : (
          <Text key={index} selectable className="text-base text-foreground">
            <Inline text={block.text} />
          </Text>
        ),
      )}
    </View>
  );
}
