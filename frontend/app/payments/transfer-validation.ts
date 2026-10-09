import type { FieldIssue } from "../ui/form-validation";
import { boundedTextIssue } from "../ui/editor-validation";

export function recipientIssues(address: string, memo: string): FieldIssue[] {
  const size = (value: string) => new TextEncoder().encode(value).length;
  const issues: FieldIssue[] = [];
  if (size(address) < 8 || size(address) > 256 || /[\s\0]/.test(address))
    issues.push({
      path: "address",
      message:
        "Enter the complete wallet address for the network shown above, without spaces.",
    });
  if (size(memo) > 128 || /[\r\n\0]/.test(memo))
    issues.push({
      path: "memo",
      message:
        "Copy the memo or tag exactly as your wallet shows it, on one line. Remove any extra text, or leave it empty if your wallet does not require one.",
    });
  return issues;
}

export function refundProposalIssues(
  receipt: boolean,
  amount: string,
  terms: string,
): FieldIssue[] {
  const issues = boundedTextIssue("terms", terms, 20, 2000);
  if (!receipt)
    issues.unshift({
      path: "receipt_id",
      message: "Choose a confirmed receipt to refund.",
    });
  const parts = amount.split(/[eE]/);
  const mantissa = (parts[0] ?? "").split(".");
  const whole = mantissa[0] ?? "";
  const fraction = mantissa[1];
  const exponent = parts[1];
  const valid =
    amount.length <= 86 &&
    parts.length <= 2 &&
    mantissa.length <= 2 &&
    /^(0|[1-9][0-9]{0,39})$/.test(whole) &&
    (fraction === undefined || /^[0-9]{1,40}$/.test(fraction)) &&
    (exponent === undefined || /^[+-]?[0-9]{1,2}$/.test(exponent)) &&
    /[1-9]/.test(parts[0] ?? "");
  if (!valid)
    issues.push({
      path: "amount",
      message:
        "Enter a positive crypto amount, using a dot for decimals. Keep it within the refundable amount shown above.",
    });
  return issues;
}
