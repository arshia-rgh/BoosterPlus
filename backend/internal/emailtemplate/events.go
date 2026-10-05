package emailtemplate

// Notice is fixed, privacy-safe event copy. It never includes private chats,
// credentials, provider payloads, recipient addresses or free-form staff notes.
type Notice struct {
	Heading     string
	Description string
	ActionLabel string
}

// Event describes an authorized, current event; unknown/older events use a safe
// generic update. Callers must verify resource ownership and version first.
func Event(kind, action string) Notice {
	if kind == "order_customer" {
		if n, ok := orderNotices[action]; ok {
			return n
		}
		return Notice{"Your order has an update", "Open your order to see the latest status, messages and any next steps.", "View your order"}
	}
	if kind == "submission_seller" {
		if action == "seller_payout_confirmed" {
			return Notice{"Seller payout confirmed", "The payment provider confirmed a transfer for your accepted seller offer. Review its amount, destination and current status in your private submission.", "View payout details"}
		}
		if action == "seller_payout_updated" {
			return Notice{"Your payout has an update", "Review your payout status and any required action. An update alone does not mean that funds have been sent.", "View payout status"}
		}
		return Notice{"Your account submission has an update", "Our team has updated your private submission or offer. Review the details before deciding your next step.", "View your submission"}
	}
	switch kind {
	case "conversation_customer":
		return Notice{"You have a support update", "There is an update in your private support conversation. Sign in to read it and reply securely.", "Open conversation"}
	case "conversation_staff":
		return Notice{"Your support workspace has an update", "Open the conversation in the admin portal to review the latest activity.", "Open admin conversation"}
	case "coordination_booster":
		return Notice{"Your team conversation has an update", "Open your booster workspace to review the latest coordination message.", "Open booster conversation"}
	case "order_staff":
		return Notice{"Your assigned order has an update", "Review your current assignment and next steps in the booster workspace.", "Open assigned order"}
	case "booking_customer", "booking_staff":
		return Notice{"Your scheduled session is approaching", "Check the latest session time and details before you join. Your order shows any changes or required preparation.", "View session details"}
	case "review_customer":
		return Notice{"Your purchase review has an update", "Open your order to check your review and its current publication status.", "View your review"}
	default:
		return Notice{"New activity on PLAYORA", "There is an update in your PLAYORA account.", "View update"}
	}
}

var orderNotices = map[string]Notice{
	"payment_verified":            {"Payment confirmed", "Your payment was verified and allocated to your order. Open the order for its receipt and current fulfillment status; any active hold still applies.", "View payment and order"},
	"payment_reversed":            {"Your payment needs review", "The provider reported a payment reversal. Review your order and contact support before making another payment.", "Review payment status"},
	"quote_issued":                {"Your quote is ready to review", "Review the exact price, requirements and validity in your order. Work starts only after you accept the quote and payment is verified.", "Review your quote"},
	"approve_completion":          {"Your order is complete", "Your order's completion has been reviewed. Open it to see the delivery details and available proof. Support remains available if something is not right.", "View completed order"},
	"account_acknowledge":         {"Account handover confirmed", "The account handover has been recorded. Review the protected delivery details and agreed security steps in your order.", "View account delivery"},
	"refund_confirmed":            {"Refund transfer confirmed", "The payment provider confirmed a refund transfer. This may be one part of your refund; check the exact amount and any remaining balance in your order. Wallet or exchange display times can vary.", "View refund details"},
	"refund_updated":              {"Your refund has an update", "Review the current refund status and any required action in your order. Approval or processing does not yet mean the transfer is confirmed.", "View refund status"},
	"case_opened":                 {"Your service case is open", "Your case has been recorded. Review the next steps in your order's Help section; affected work may remain on hold during review.", "View your case"},
	"case_updated":                {"Your service case has an update", "There is an update to your private case. Open Help in your order to review it and respond if needed.", "View your case"},
	"case_resolved":               {"Your service case decision is ready", "Review the case decision and any agreed next steps. A resolved case does not by itself confirm that a refund has been transferred.", "Review case decision"},
	"checkout_expired":            {"Your checkout window expired", "Do not use the old payment instructions. Open your order for current options. If you already sent funds, contact support before paying again.", "Review your order"},
	"shop_reservation_expired":    {"Your shop reservation expired", "The unpaid reservation has expired. If you already sent funds, contact support before paying again; a late payment does not guarantee stock.", "Review your order"},
	"account_reservation_expired": {"Your account reservation expired", "The unpaid reservation has expired. If you already sent funds, contact support before paying again; a late payment does not guarantee availability.", "Review your order"},
	"start":                       {"Work on your order has started", "Your team has started work. Follow progress and communicate securely from your order page.", "View progress"},
	"shop_delivery_start":         {"Your shop order is being prepared", "Our team has started processing your delivery. Check your order for progress and any information we need from you.", "View delivery progress"},
	"outgoing_exception":          {"A transfer needs review", "A financial transfer for your order needs review. Open its current record or contact support for the next steps.", "Review transfer status"},
}
