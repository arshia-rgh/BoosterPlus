<?php
// Small, local presentation plugin; no authentication or message hooks.
class playora_support extends rcube_plugin
{
    public function init()
    {
        $this->include_stylesheet('support.css');
    }
}
