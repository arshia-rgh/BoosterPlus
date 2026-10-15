package submissions

import "github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"

func editIssues(input Edit) []catalog.Issue {
	var issues []catalog.Issue
	if !text(input.Title, 1, 120) {
		issues = append(issues, catalog.Issue{Path: "title", Message: "Enter an account title of 1–120 characters."})
	}
	if !text(input.OwnershipNotes, 0, 2000) {
		issues = append(issues, catalog.Issue{Path: "ownership_notes", Message: "Use no more than 2,000 characters, without control characters."})
	}
	return issues
}
