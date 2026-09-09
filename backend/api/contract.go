// Package api holds the versioned public OpenAPI contract.
package api

import _ "embed"

// Contract is the authoritative OpenAPI document, copied explicitly by frontend contract-update.
//
//go:embed openapi.json
var Contract []byte
