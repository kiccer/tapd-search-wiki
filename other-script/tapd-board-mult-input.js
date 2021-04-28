// ==UserScript==
// @name         Tapd看板支持回车换行
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  让tapd看板评论支持回车换行
// @author       kiccer<1072907338@qq.com>
// @include      /^https:\/\/www\.tapd\.cn\/\d+\/board\/index\?board_id=\d+/
// @icon         https://www.google.com/s2/favicons?domain=tapd.cn
// @grant        none
// ==/UserScript==

/* global $ */
// @match        https://www.tapd.cn/37684008/board/index?board_id=1137684008001000081#!order=default&cardId=1137684008001001801

(function () {
    'use strict'

    // 随机字符串
    const GM_ADD_STYLE_HASH = `GM_addStyle_${parseInt(Math.random() * Date.now())}`

    // GM_addStyle 方法
    function GM_addStyle (css, dom = document.head, id = GM_ADD_STYLE_HASH) {
        const style = document.getElementById(id) || (() => {
            const style = document.createElement('style')
            style.type = 'text/css'
            style.id = id
            dom.appendChild(style)
            return style
        })()
        const sheet = style.sheet
        // sheet.insertRule(css, (sheet.rules || sheet.cssRules || []).length)
        css.split('\n\n').forEach(n => sheet.insertRule(n, (sheet.rules || sheet.cssRules || []).length))
    }

    window.addEventListener('load', e => {
        setTimeout(() => {
            const iframe = document.querySelector('iframe.editor-iframe')
            const input = iframe.contentWindow.document.body
            // console.log(input)
            $(input).css({
                height: 'auto',
                maxHeight: 167
            })

            input.addEventListener('keydown', e => {
                // console.log(e, input.offsetHeight)
                setTimeout(() => {
                    $('.editor-area').css({
                        height: Math.max(30, Math.min(input.offsetHeight + 3, 170))
                    })
                })
                if (e.key === 'Enter' && !e.ctrlKey) {
                    e.cancelBubble = true
                }
            })
        })

        // 样式覆盖
        GM_addStyle(`
            #taskboard-wrap {
                background-image: url(https://www.tapd.cn/tfl/pictures/202104/tapd_37684008_1619574710_20.jpg);
                background-size: cover !important;
                background-position: center center !important;
            }

            #content-board-name {
                color: #fff !important;
            }

            #btnBoardMore {
                background-color: rgba(0, 0, 0, 0) !important;
            }

            .board-name .text:hover {
                background-color: rgba(0, 0, 0, .15) !important;
            }

            .list, .add-list {
                background-color: rgba(255, 255, 255, .26) !important;
                border-width: 0px !important;
                box-shadow: 0 0 7px rgb(0 0 0 / 26%);
            }

            .add-list span {
                color: #7b9196 !important;
                margin-left: 5px;
            }

            .cards-wrap,
            .list-bottom {
                background-color: rgba(255, 255, 255, 0) !important;
                border-top: 0px !important;
            }

            .cards-wrap .cards > .card {
                border-top: 1px solid rgba(255, 255, 255, .3) !important;
            }

            .card:hover {
                background-color: rgba(0, 0, 0, .05) !important;
            }

            .finish-card-btn {
                background-color: rgba(255, 255, 255, 0) !important;
                border: 1px solid #8e8e8e !important;
            }

            .add-list .icon {
                background: none !important;
            }

            .add-list .icon-board-add::before {
                display: inline-block;
                font-family: "common.iconfont";
                font-style: normal;
                font-weight: normal;
                line-height: 1;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                color: #8091a5;
                vertical-align: middle;
                line-height: normal;
                content: "\\EA04";
                position: relative;
                top: -3px;
            }
        `, document.head, 'board-css-kiccer')
    })
})()
