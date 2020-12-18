// ==UserScript==
// @name         【tapd】一键查询所有项目中的wiki
// @namespace    https://github.com/kiccer/tapd-search-wiki
// @version      0.5
// @description  为了方便在tapd的wiki中查找接口而开发
// @author       kiccer<1072907338@qq.com>
// @include      /^https:\/\/www\.tapd\.cn\/\d+\/markdown_wikis\/(show\/|search\?.*kiccer=true)$/
// @require      https://cdn.bootcdn.net/ajax/libs/vue/2.6.9/vue.js
// @require      https://cdn.bootcdn.net/ajax/libs/axios/0.21.0/axios.js
// @grant        none
// ==/UserScript==

/* global Vue axios */
// https://www.tampermonkey.net/documentation.php
// https://element.eleme.cn/#/zh-CN/component/button

(() => {
    'use strict'

    // 当前是否是 show 页面
    const IN_SHOW_PAGE = /^https:\/\/www\.tapd\.cn\/\d+\/markdown_wikis\/show\/.*$/.test(location.href)
    // 当前是否是 search 页面
    const IN_SEARCH_PAGE = /^https:\/\/www\.tapd\.cn\/\d+\/markdown_wikis\/search\?.*$/.test(location.href)
    // 当前项目id
    const CURR_PROJECT_ID = location.href.match(/(?<=https:\/\/www.tapd.cn\/)\d+(?=\/markdown_wikis\/)/g)[0] || ''
    // 随机字符串
    const GM_ADD_STYLE_HASH = `GM_addStyle_${parseInt(Math.random() * Date.now())}`
    // 页面 query 参数
    const URL_QUERY = (() => {
        const queryStr = location.href.split('?')[1]
        if (queryStr) {
            const res = {}
            queryStr.split('&').forEach(n => {
                const [key, val] = n.split('=')
                res[key] = val
            })
            return res
        } else {
            return {}
        }
    })()

    // GM_addStyle 方法
    function GM_addStyle (css) {
        const style = document.getElementById(GM_ADD_STYLE_HASH) || (() => {
            const style = document.createElement('style')
            style.type = 'text/css'
            style.id = GM_ADD_STYLE_HASH
            document.head.appendChild(style)
            return style
        })()
        const sheet = style.sheet
        // sheet.insertRule(css, (sheet.rules || sheet.cssRules || []).length)
        css.split('\n\n').forEach(n => sheet.insertRule(n, (sheet.rules || sheet.cssRules || []).length))
    }

    // 自写 Promise.all 方法
    function PromiseAll (arr = []) {
        return new Promise((resolve, reject) => {
            const resVal = Array(arr.length).fill()

            arr.forEach((func, index) => {
                func().then(res => {
                    resVal[index] = res
                    if (resVal.every(n => n)) resolve(resVal)
                }).catch(err => {
                    reject(err)
                })
            })
        })
    }

    // 加载 element-ui script
    function elementScript () {
        return new Promise((resolve, reject) => {
            const vueListener = setInterval(() => {
                // 注册全局 Vue
                window.Vue || (window.Vue = Vue)
                if (window.Vue) {
                    clearInterval(vueListener)
                    const elScript = document.createElement('script')
                    elScript.setAttribute('src', 'https://cdn.bootcdn.net/ajax/libs/element-ui/2.14.1/index.min.js')
                    document.head.appendChild(elScript)
                    elScript.addEventListener('load', resolve)
                    elScript.addEventListener('error', reject)
                }
            }, 100)
        })
    }

    // 加载 element-ui css
    function elementStyle () {
        return new Promise((resolve, reject) => {
            const elStyle = document.createElement('link')
            elStyle.setAttribute('href', 'https://cdn.bootcdn.net/ajax/libs/element-ui/2.14.1/theme-chalk/index.min.css')
            elStyle.setAttribute('rel', 'stylesheet')
            document.head.appendChild(elStyle)
            elStyle.addEventListener('load', resolve)
            elStyle.addEventListener('error', reject)
        })
    }

    // 等待所有依赖项加载完毕后再执行
    PromiseAll([
        elementScript,
        elementStyle
    ]).then(() => {
        init()
    }).catch(err => {
        console.log(222, err)
    })

    // vue 实例
    let searchVue, resultVue

    // vue 组件 (搜索框)
    Vue.component('search-input', {
        name: 'search-input',

        template: `
            <el-input
                placeholder="在你所有项目的wiki中搜索..."
                size="medium"
                v-model="_value"
            >
                <el-button
                    slot="append"
                    icon="el-icon-search"
                    @click="search"
                />
            </el-input>
        `,

        props: {
            value: {
                type: String,
                default: ''
            }
        },

        computed: {
            _value: {
                get () {
                    return this.value
                },
                set (val) {
                    this.$emit('input', val)
                }
            }
        },

        created () {
            if (IN_SEARCH_PAGE) {
                this._value = decodeURIComponent(URL_QUERY.search) || ''
            }
        },

        methods: {
            search () {
                location.href = `https://www.tapd.cn/${CURR_PROJECT_ID}/markdown_wikis/search?search=${encodeURIComponent(this._value)}&kiccer=true`
            }
        }
    })

    // 搜索结果展示组件
    Vue.component('wiki-list', {
        name: 'wiki-list',

        template: `<div v-html="html" />`,

        props: {
            html: String
        }
    })

    // 初始化
    function init () {
        // 添加 vue 容器
        const headerBar = document.getElementById('hd')
        const app = document.createElement('div')
        headerBar.appendChild(app)
        headerBar.removeChild(
            document.querySelector('.main-search-area')
        )

        searchVue = new Vue({
            el: app,

            name: 'kiccer-tampermonkey-tapd-wiki-search',

            template: `
                <div class="kiccer-tampermonkey-tapd-wiki-search">
                    <search-input />
                </div>
            `
        })

        // 如果是 search 页面则添加搜索结果列表容器
        if (IN_SEARCH_PAGE && URL_QUERY.kiccer) {
            const searchResultContainer = document.querySelector('.search-result')
            const resultDom = document.createElement('div')
            searchResultContainer.appendChild(resultDom)

            ;[
                document.querySelector('.search-div'),
                document.querySelector('.wiki-list'),
                document.querySelector('.simple-pager'),
            ].forEach(n => n && searchResultContainer.removeChild(n))

            resultVue = new Vue({
                el: resultDom,

                name: 'kiccer-tampermonkey-tapd-wiki-result',

                template: `
                    <div class="wiki-list">
                        <search-input v-model="wd" />

                        <iframe
                            class="hide-iframe"
                            v-for="(n, i) in ids"
                            :key="n"
                            :src="'https://www.tapd.cn/' + n + '/markdown_wikis/search?search=' + wd"
                            @load="e => iframeLoaded(e, i)"
                        />

                        <wiki-list
                            v-for="(n, i) in wikiList"
                            :key="i"
                            :html="n"
                        />
                    </div>
                `,

                data () {
                    return {
                        ids: [],
                        wd: '',
                        wikiList: []
                    }
                },

                computed: {
                    wikiListHtml () {
                        return this.wikiList.join('')
                    }
                },

                mounted () {
                    // 获取所有项目 id
                    axios({
                        url: 'https://www.tapd.cn/company/my_take_part_in_projects_list?project_id=' + CURR_PROJECT_ID
                    }).then(res => {
                        // console.log(res.data)
                        this.ids = res.data.match(/(?<=object-id=")\d+(?="><\/i>)/g)
                        this.wikiList = Array(this.ids.length).fill().map(_ => '')
                    })
                },

                methods: {
                    iframeLoaded (e, i) {
                        const list = e.path[0].contentDocument.body.querySelector('.wiki-list')
                        this.$set(this.wikiList, i, list ? list.innerHTML : '')
                    }
                }
            })
        }
    }

    // 公共样式
    GM_addStyle(`
        .kiccer-tampermonkey-tapd-wiki-search {
            float: right;
            height: 100%;
            display: flex;
            align-items: center;
            margin-right: 15px;
        }

        .kiccer-tampermonkey-tapd-wiki-search .el-input input {
            width: 200px;
        }
    `)

    // 搜索页样式
    if (IN_SEARCH_PAGE) {
        GM_addStyle(`
            .wiki-list .el-input {
                margin-bottom: 20px;
            }

            .wiki-list .el-input input {
                width: 100%;
            }

            .hide-iframe {
                display: none;
            }
        `)
    }

    // 展示页样式
    if (IN_SHOW_PAGE) {
        // GM_addStyle(``)
    }

})()























