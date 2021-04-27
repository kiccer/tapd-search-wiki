// ==UserScript==
// @name         Tapd看板支持回车换行
// @namespace    http://tampermonkey.net/
// @version      0.1
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
    })
})()
