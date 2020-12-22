// ==UserScript==
// @name         【tapd】一键查询所有项目中的wiki
// @namespace    https://github.com/kiccer/tapd-search-wiki
// @version      2.0.0
// @description  为了方便在tapd的wiki中查找接口而开发
// @author       kiccer<1072907338@qq.com>
// @copyright    2020, kiccer (https://github.com/kiccer)
// @license      MIT
// @iconURL      https://www.google.com/s2/favicons?domain=www.tapd.cn
// @include      /^https:\/\/www\.tapd\.cn\/\d+\/markdown_wikis\/(show\/|search\?.*)$/
// @require      https://cdn.bootcdn.net/ajax/libs/vue/2.6.9/vue.js
// @require      https://cdn.bootcdn.net/ajax/libs/axios/0.21.0/axios.js
// @require      https://cdn.bootcdn.net/ajax/libs/tween.js/18.6.4/tween.umd.min.js
// @noframes     这个千万别删掉！会出现死循环的！
// @nocompat     Chrome
// @grant        none
// ==/UserScript==

/* global Vue axios TWEEN takePartInWorkspaces */
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
    // 从 session 中获取缓存的搜索词
    const SEARCH_WORD = sessionStorage.getItem('tapd-search-wiki/search_word') || ''
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

    // vue 组件 (搜索框)
    Vue.component('search-input', {
        name: 'search-input',

        template: `
            <div>
                <el-input
                    placeholder="在你所有项目的wiki中搜索..."
                    size="medium"
                    v-model="keyword"
                    @keydown.enter.native="search"
                >
                    <el-button
                        slot="append"
                        icon="el-icon-search"
                        :loading="loading"
                        @click="search"
                    />
                </el-input>
            </div>
        `,

        props: {
            enter: Function,
            loading: Boolean
        },

        data () {
            return {
                keyword: ''
            }
        },

        created () {
            if (IN_SEARCH_PAGE) {
                this.keyword = SEARCH_WORD || decodeURIComponent(URL_QUERY.search) || ''
            }
        },

        methods: {
            search () {
                if (this.loading) return

                // 保存搜索词
                sessionStorage.setItem('tapd-search-wiki/search_word', this.keyword)

                // 如果绑定了 enter 方法，那就支持无刷新更新数据
                if (this.enter) {
                    this.enter(this.keyword)
                } else {
                    location.href = `https://www.tapd.cn/${CURR_PROJECT_ID}/markdown_wikis/search?search=${encodeURIComponent(this.keyword)}`
                }
            }
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

        new Vue({
            el: app,

            name: 'kiccer-tampermonkey-tapd-wiki-search',

            template: `
                <div class="kiccer-tampermonkey-tapd-wiki-search">
                    <search-input />
                </div>
            `
        })

        // 如果是 search 页面则添加搜索结果列表容器
        if (IN_SEARCH_PAGE) {
            const searchResultContainer = document.querySelector('.search-result')
            const resultDom = document.createElement('div')
            searchResultContainer.appendChild(resultDom)

            ;[
                document.querySelector('.search-div'),
                document.querySelector('.wiki-list'),
                document.querySelector('.simple-pager')
            ].forEach(n => n && searchResultContainer.removeChild(n))

            new Vue({
                el: resultDom,

                name: 'kiccer-tampermonkey-tapd-wiki-result',

                template: `
                    <div class="wiki-list">
                        <search-input
                            :loading="!allLoaded"
                            :enter="onSearchInputEnter"
                        />

                        <el-alert
                            type="warning"
                            title="目前仅查询每个项目中wiki的第一页内容~"
                            style="margin-bottom: 20px;"
                        />

                        <iframe
                            class="hide-iframe"
                            v-for="(n, i) in projects"
                            :key="n.id"
                            :src="'https://www.tapd.cn/' + n.id + '/markdown_wikis/search?search=' + wd"
                            @load="e => iframeLoaded(e, i)"
                        />

                        <el-tabs
                            type="card"
                            v-model="activeTab"
                            v-if="projectsInTab.length"
                        >
                            <el-tab-pane
                                v-for="(n, i) in projectsInTab"
                                :key="n.id"
                                :label="n.project_name"
                                :name="n.pretty_name"
                            >
                                <div
                                    class="tab-label"
                                    slot="label"
                                    v-html="tabLabelHtml(n.index)"
                                />

                                <transition name="fade">
                                    <div
                                        v-html="wikiHTMLList[n.index]"
                                        v-if="n.pretty_name === activeTab"
                                    />
                                </transition>
                            </el-tab-pane>
                        </el-tabs>

                        <div v-else>啥也没找到...</div>

                        <transition name="fade">    
                            <div
                                class="back-top"
                                v-show="toggle.showBackTop"
                                @click="backTop"
                            >
                                <i class="el-icon-arrow-up" />
                            </div>
                        </transition>
                    </div>
                `,

                data () {
                    return {
                        toggle: {
                            showBackTop: window.scrollY >= 200
                        },
                        projects: [],
                        wd: '',
                        wikiHTMLList: [],
                        loaded: [],
                        scroll: { x: 0, y: 0 },
                        activeTab: ''
                    }
                },

                created () {
                    if (IN_SEARCH_PAGE) {
                        this.wd = SEARCH_WORD || decodeURIComponent(URL_QUERY.search) || ''
                    }
                },

                computed: {
                    allLoaded () {
                        return !(this.loaded || []).includes(false)
                    },

                    projectsInTab () {
                        return this.projects.filter((n, i) => this.wikiHTMLList[i])
                    }
                },

                watch: {
                    allLoaded (val, old) {
                        if (val) {
                            const firstTab = this.projectsInTab[0]
                            this.activeTab = firstTab ? firstTab.pretty_name : ''
                        }
                    }
                },

                mounted () {
                    // 设置返回顶部按钮
                    this.setBackTopBtn()

                    // 获取所有项目 id
                    axios({
                        url: 'https://www.tapd.cn/company/my_take_part_in_projects_list?project_id=' + CURR_PROJECT_ID
                    }).then(res => {
                        // console.log(res.data)
                        this.projects = takePartInWorkspaces.map((n, i) => ({
                            ...n,
                            index: i,
                            switches: JSON.parse(n.switches)
                        }))
                        this.wikiHTMLList = Array(this.projects.length).fill().map(_ => '')
                        this.loaded = Array(this.projects.length).fill().map(_ => false)
                    })
                },

                methods: {
                    iframeLoaded (e, i) {
                        const list = e.path[0].contentDocument.body.querySelector('.wiki-list')
                        this.$set(this.wikiHTMLList, i, list ? list.innerHTML : '')
                        this.$set(this.loaded, i, true)
                    },

                    onSearchInputEnter (val) {
                        if (val === this.wd) return
                        this.wd = val
                        this.loaded = Array(this.projects.length).fill().map(_ => false)
                    },

                    setBackTopBtn () {
                        function animate (time) {
                            requestAnimationFrame(animate)
                            TWEEN.update(time)
                        }
                        requestAnimationFrame(animate)
                        window.addEventListener('scroll', e => {
                            // console.log(e)
                            this.toggle.showBackTop = window.scrollY >= 200
                        })
                    },

                    backTop () {
                        this.scroll = {
                            x: window.scrollX,
                            y: window.scrollY
                        }

                        new TWEEN.Tween(this.scroll) // Create a new tween that modifies 'coords'.
                            .to({ x: 0, y: 0 }, 500) // Move to (300, 200) in 1 second.
                            .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
                            .onUpdate(() => {
                                // Called after tween.js updates 'coords'.
                                // Move 'box' to the position described by 'coords' with a CSS translation.
                                window.scrollTo(this.scroll.x, this.scroll.y)
                            })
                            .start() // Start the tween immediately.
                    },

                    tabLabelHtml (index) {
                        const projectInfo = this.projects[index]
                        const logo = projectInfo.logo_src
                            ? `<img class="project-logo" src="${projectInfo.logo_src}" />`
                            : `<i class="project-logo project-logo-${projectInfo.logoId}">${projectInfo.project_name[0]}</i>`

                        return `
                            <div class="current-project">
                                ${logo}
                                <span class="project-name">${projectInfo.project_name}</span>
                            </div>
                        `
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

        .fade-enter-active, .fade-leave-active {
            transition: opacity .5s;
        }

        .fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
            opacity: 0;
        }
    `)

    // 搜索页样式
    if (IN_SEARCH_PAGE) {
        GM_addStyle(`
            .wiki-list-wrapper {
                padding: 20px;
                margin-bottom: 20px;
                border-radius: 4px;
                // box-shadow: 0 0 10px rgba(128,145,165,0.2);
                border: 1px solid #dcdfe6;
            }

            .wiki-list .el-tabs__item {
                padding: 0 10px !important;
            }

            .wiki-list .el-tabs__item.is-active .project-name {
                font-weight: bold;
            }

            .wiki-list .el-tabs__header {
                margin-bottom: 0;
            }

            .wiki-list .el-tabs__content {
                border: 1px solid #e4e7ed;
                border-top: none;
                border-radius: 0 0 4px 4px;
                padding: 15px;
            }

            .wiki-list .tab-label {
                display: inline-flex;
                align-items: center;
                width: auto;
                height: 100%;
            }

            .wiki-list .current-project {
                display: inline-block;
                width: auto;
                min-width: auto;
                margin: 0;
                height: 24px;
                line-height: 24px;
            }

            .wiki-list .el-input {
                margin-bottom: 20px;
            }

            .wiki-list .el-input input {
                width: 100%;
            }

            .wiki-list .back-top {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 50px;
                height: 50px;
                background-color: #f5f7fa;
                position: fixed;
                left: 790px;
                bottom: 61px;
                border: 1px solid rgb(220, 223, 230);
                font-size: 20px;
                border-radius: 4px;
                cursor: pointer;
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
