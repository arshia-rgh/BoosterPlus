<?php
// Local presentation/composer tools; never intercept authentication or sending.
class playora_support extends rcube_plugin
{
    public function init()
    {
        $this->include_stylesheet('support.css');
        if (rcmail::get_instance()->task === 'mail' && rcmail::get_instance()->action === 'compose') {
            $this->include_script('template.js');
        }
    }
}
