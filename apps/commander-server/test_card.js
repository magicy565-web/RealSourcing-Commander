const card = {
  msg_type: "interactive",
  card: {
    config: {
      wide_screen_mode: {
        enable: true,
      },
    },
    header: {
      title: {
        content: "✅ 报价已发出",
        tag: "plain_text",
      },
      template: "green",
    },
    elements: [
      {
        tag: "div",
        text: {
          content: "**产品：** Test Product\n**单价：** USD 88",
          tag: "lark_md",
        },
      },
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: {
              content: "查看询盘",
              tag: "plain_text",
            },
            type: "primary",
            url: "realsourcing://inquiry/inq-004",
          },
        ],
      },
    ],
  },
};

console.log(JSON.stringify(card, null, 2));
console.log("\nCard JSON length:", JSON.stringify(card).length);
