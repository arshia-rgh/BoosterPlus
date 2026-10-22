package wanted

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
)

func TestResponsesAndRequestsMatchContract(t *testing.T) {
	var document any
	if err := json.Unmarshal(api.Contract, &document); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("contract.json", document); err != nil {
		t.Fatal(err)
	}
	id := "00000000-0000-4000-8000-000000004801"
	entry := Entry{ID: id, GameID: id, Title: strings.Repeat("é", maxTitle), Description: "a\nb", Position: 0, Visible: true, Version: 2, UpdatedAt: time.Unix(0, 0).UTC()}
	valid := map[string]any{
		"WantedAccount":           entry,
		"WantedAccountList":       List{GameID: id, GameName: "Mobile Legends", GameSlug: "mobile-legends", Open: true, Limit: MaxPerGame, Shown: MaxShown, Items: []Entry{entry}},
		"WantedAccountCreate":     CreateInput{RequestKey: id, GameID: id, Input: Input{Title: "Legend", Description: "", Visible: false}},
		"WantedAccountUpdate":     UpdateInput{Version: 1, Input: Input{Title: "Legend", Description: "x", Visible: true}},
		"WantedAccountMove":       MoveInput{Version: 1, Direction: "down"},
		"WantedAccountVersion":    VersionInput{Version: 1},
		"WantedAccountDeleted":    map[string]bool{"deleted": true},
		"WantedAccountPublicList": PublicList{Items: []PublicEntry{{ID: id, Title: "Legend", Description: ""}}},
		"WantedAccountProblem":    map[string]any{"code": "wanted_account_invalid", "issues": shownLimit().Issues},
	}
	invalid := map[string]any{
		"WantedAccountPublicList": map[string]any{"items": []map[string]any{{"id": id, "title": "Legend", "description": "", "visible": true}}},
		"WantedAccountMove":       MoveInput{Version: 1, Direction: "left"},
		"WantedAccountCreate":     map[string]any{"request_key": id, "game_id": id, "title": strings.Repeat("x", maxTitle+1), "description": "", "visible": true},
	}
	check := func(name string, value any) error {
		schema, err := compiler.Compile("contract.json#/components/schemas/" + name)
		if err != nil {
			t.Fatal(err)
		}
		encoded, err := json.Marshal(value)
		if err != nil {
			t.Fatal(err)
		}
		var data any
		if err = json.Unmarshal(encoded, &data); err != nil {
			t.Fatal(err)
		}
		return schema.Validate(data)
	}
	for name, value := range valid {
		if err := check(name, value); err != nil {
			t.Fatal(name, err)
		}
	}
	for name, value := range invalid {
		if check(name, value) == nil {
			t.Fatal("contract accepted invalid", name)
		}
	}
}
