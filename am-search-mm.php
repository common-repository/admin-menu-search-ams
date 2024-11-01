<?php
/*
Plugin Name: Admin Menu Search (AMS)
Description: Quickly search for menu items with support for multiple keyboard layouts.
Version: 1.0.0
Requires at least: 6.4
Requires PHP: 7.0
Author: Maxim K.
Author URI: https://maksam07.com/
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html
*/

if (!defined('ABSPATH')) exit;

define('AMSRC_VERSION', '1.0.0');


add_action('admin_bar_menu', 'amsrc_admin_bar_menu', 0);
function amsrc_admin_bar_menu($wp_admin_bar) {
    if (!is_admin()) return false;

    $wp_admin_bar->add_node([
        'id' => 'amsrc',
        'title' => '<input class="amsrc" type="text" placeholder="\'/\' to search" />',
    ]);

    return true;
}


add_action('admin_enqueue_scripts', 'amsrc_admin_enqueue_scripts');
function amsrc_admin_enqueue_scripts() {
    wp_enqueue_style('my-plugin-admin-css', plugin_dir_url(__FILE__) . 'admin/css/main.css', [], AMSRC_VERSION);
    wp_enqueue_script('admin-menu-search', plugin_dir_url(__FILE__) . 'admin/js/main.js', ['jquery'], AMSRC_VERSION, false);
}
