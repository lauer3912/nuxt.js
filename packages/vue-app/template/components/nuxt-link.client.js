import Vue from 'vue'

const requestIdleCallback = window.requestIdleCallback ||
  function (cb) {
    const start = Date.now()
    return setTimeout(function () {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
      })
    }, 1)
  }

const cancelIdleCallback = window.cancelIdleCallback || function (id) {
  clearTimeout(id)
}

/// lauer3912: Intersection Observer API提供了一种异步检测目标元素与祖先元素或 viewport 相交情况变化的方法。
/// 参考：https://developer.mozilla.org/zh-CN/docs/Web/API/Intersection_Observer_API
/// 应用的场景:
///  1.图片懒加载——当图片滚动到可见时才进行加载
///  2.内容无限滚动——也就是用户滚动到接近内容底部时直接加载更多，而无需用户操作翻页，给用户一种网页可以无限滚动的错觉
///  3.检测广告的曝光情况——为了计算广告收益，需要知道广告元素的曝光情况
///  4.在用户看见某个区域时执行任务或播放动画
const observer = window.IntersectionObserver && new window.IntersectionObserver((entries) => {
  entries.forEach(({ intersectionRatio, target: link }) => {
    if (intersectionRatio <= 0 || !link.__prefetch) {
      return
    }
    link.__prefetch()
  })
})

<%= isTest ? '// @vue/component' : '' %>
export default {
  name: 'NuxtLink',
  extends: Vue.component('RouterLink'),
  props: {
    prefetch: {
      type: Boolean,
      default: <%= router.prefetchLinks ? 'true' : 'false' %>
    },
    noPrefetch: {
      type: Boolean,
      default: false
    }<% if (router.linkPrefetchedClass) { %>,
    prefetchedClass: {
      type: String,
      default: '<%= router.linkPrefetchedClass %>'
    }<% } %>
  },
  mounted () {
    if (this.prefetch && !this.noPrefetch) {
      this.handleId = requestIdleCallback(this.observe, { timeout: 2e3 })
    }
  },
  beforeDestroy () {
    cancelIdleCallback(this.handleId)

    if (this.__observed) {
      observer.unobserve(this.$el)
      delete this.$el.__prefetch
    }
  },
  methods: {
    observe () {
      // If no IntersectionObserver, avoid prefetching
      if (!observer) {
        return
      }
      // Add to observer
      if (this.shouldPrefetch()) {
        this.$el.__prefetch = this.prefetchLink.bind(this)
        observer.observe(this.$el)
        this.__observed = true
      }<% if (router.linkPrefetchedClass) { %> else {
        this.addPrefetchedClass()
      }<% } %>
    },
    shouldPrefetch () {
      <% if (isFullStatic && router.prefetchPayloads) { %>
      const ref = this.$router.resolve(this.to, this.$route, this.append)
      const Components = ref.resolved.matched.map(r => r.components.default)

      return Components.filter(Component => ref.href || (typeof Component === 'function' && !Component.options && !Component.__prefetched)).length
      <% } else { %>return this.getPrefetchComponents().length > 0<% } %>
    },
    canPrefetch () {
      const conn = navigator.connection
      const hasBadConnection = this.<%= globals.nuxt %>.isOffline || (conn && ((conn.effectiveType || '').includes('2g') || conn.saveData))

      return !hasBadConnection
    },
    getPrefetchComponents () {
      const ref = this.$router.resolve(this.to, this.$route, this.append)
      const Components = ref.resolved.matched.map(r => r.components.default)

      return Components.filter(Component => typeof Component === 'function' && !Component.options && !Component.__prefetched)
    },
    prefetchLink () {
      if (!this.canPrefetch()) {
        return
      }
      // Stop observing this link (in case of internet connection changes)
      observer.unobserve(this.$el)
      const Components = this.getPrefetchComponents()
      <% if (router.linkPrefetchedClass) { %>const promises = []<% } %>

      for (const Component of Components) {
        const componentOrPromise = Component()
        if (componentOrPromise instanceof Promise) {
          componentOrPromise.catch(() => {})
          <% if (router.linkPrefetchedClass) { %>promises.push(componentOrPromise)<% } %>
        }
        Component.__prefetched = true
      }
      <% if (isFullStatic && router.prefetchPayloads) { %>
      // Preload the data only if not in preview mode
      if (!this.$root.isPreview) {
        const { href } = this.$router.resolve(this.to, this.$route, this.append)
        if (this.<%= globals.nuxt %>)
          this.<%= globals.nuxt %>.fetchPayload(href, true).catch(() => {})
      }
      <% } %>
      <% if (router.linkPrefetchedClass) { %>
      return Promise.all(promises).then(() => this.addPrefetchedClass())
      <% } %>
    }<% if (router.linkPrefetchedClass) { %>,
    addPrefetchedClass () {
      if (this.prefetchedClass !== 'false') {
        this.$el.className = (this.$el.className + ' ' + this.prefetchedClass).trim()
      }
    }<% } %>
  }
}
