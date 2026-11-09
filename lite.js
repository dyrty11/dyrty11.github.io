/* Облегчённый режим для телефонов и слабых устройств: CSS из glass.css (html.lite) отключает
 * размытие стекла и бесконечные анимации. Подключается в <head> до отрисовки. */
(function () {
    try {
        var mm = window.matchMedia, n = navigator, c = n.connection || {};
        var lite = (mm && (mm('(pointer: coarse)').matches || mm('(max-width: 820px)').matches)) ||
            (n.deviceMemory && n.deviceMemory <= 4) || c.saveData === true;
        if (lite) document.documentElement.classList.add('lite');
    } catch (e) {}
})();
