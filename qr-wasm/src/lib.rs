//! Построение матрицы QR-кода для qr.html.
//!
//! Модуль без wasm-bindgen: страница вызывает пять функций напрямую.
//!   qr_alloc(n) -> ptr          выделить n байт под текст
//!   qr_free(ptr, n)             освободить их
//!   qr_encode(ptr, len, ecl, min_version) -> n
//!       ecl: 0=L, 1=M, 2=Q, 3=H. Возвращает сторону матрицы в модулях
//!       или отрицательный код: -1 текст слишком длинный, -2 неверные аргументы.
//!   qr_modules() -> ptr         n*n байт: 1 тёмный модуль, 0 светлый (строка за строкой)
//!   qr_modules_len() -> len

use qrcodegen::{QrCode, QrCodeEcc, QrSegment, Version};
use std::cell::RefCell;

thread_local! {
    static OUT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
}

/// Строит матрицу. Режим кодирования (цифры, буквы, байты) выбирается как в JS-библиотеке:
/// одним сегментом на весь текст. Ошибку исправления не повышает сверх запрошенной.
pub fn encode(text: &str, ecl: u32, min_version: u32) -> Result<(usize, Vec<u8>), i32> {
    let ecc = match ecl {
        0 => QrCodeEcc::Low,
        1 => QrCodeEcc::Medium,
        2 => QrCodeEcc::Quartile,
        3 => QrCodeEcc::High,
        _ => return Err(-2),
    };
    if !(0..=40).contains(&min_version) {
        return Err(-2);
    }
    let lo = Version::new(min_version.max(1) as u8);
    let segs = QrSegment::make_segments(text);
    let qr = QrCode::encode_segments_advanced(&segs, ecc, lo, Version::MAX, None, false)
        .map_err(|_| -1)?;
    let n = qr.size() as usize;
    let mut out = Vec::with_capacity(n * n);
    for y in 0..n as i32 {
        for x in 0..n as i32 {
            out.push(qr.get_module(x, y) as u8);
        }
    }
    Ok((n, out))
}

#[no_mangle]
pub extern "C" fn qr_alloc(n: usize) -> *mut u8 {
    let mut v = Vec::<u8>::with_capacity(n.max(1));
    let p = v.as_mut_ptr();
    std::mem::forget(v);
    p
}

/// # Safety
/// `ptr` и `n` должны быть теми же, что вернул и получил `qr_alloc`.
#[no_mangle]
pub unsafe extern "C" fn qr_free(ptr: *mut u8, n: usize) {
    drop(Vec::from_raw_parts(ptr, 0, n.max(1)));
}

/// # Safety
/// `ptr` указывает на `len` байт, выделенных через `qr_alloc` и заполненных текстом в UTF-8.
#[no_mangle]
pub unsafe extern "C" fn qr_encode(ptr: *const u8, len: usize, ecl: u32, min_version: u32) -> i32 {
    let bytes = std::slice::from_raw_parts(ptr, len);
    let Ok(text) = std::str::from_utf8(bytes) else { return -2 };
    match encode(text, ecl, min_version) {
        Ok((n, m)) => {
            OUT.with(|o| *o.borrow_mut() = m);
            n as i32
        }
        Err(code) => code,
    }
}

#[no_mangle]
pub extern "C" fn qr_modules() -> *const u8 {
    OUT.with(|o| o.borrow().as_ptr())
}

#[no_mangle]
pub extern "C" fn qr_modules_len() -> usize {
    OUT.with(|o| o.borrow().len())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_grows_with_text() {
        let (n1, _) = encode("A", 1, 0).unwrap();
        assert_eq!(n1, 21);
        let (n2, _) = encode(&"x".repeat(100), 1, 0).unwrap();
        assert!(n2 > 21 && (n2 - 17) % 4 == 0);
    }

    #[test]
    fn finder_patterns_present() {
        let (n, m) = encode("https://dyrty11.github.io", 2, 0).unwrap();
        for (ox, oy) in [(0, 0), (n - 7, 0), (0, n - 7)] {
            for i in 0..7 {
                assert_eq!(m[oy * n + ox + i], 1);
                assert_eq!(m[(oy + 6) * n + ox + i], 1);
                assert_eq!(m[(oy + i) * n + ox], 1);
            }
            assert_eq!(m[(oy + 3) * n + ox + 3], 1);
            assert_eq!(m[(oy + 1) * n + ox + 1], 0);
        }
    }

    #[test]
    fn too_long_and_bad_args() {
        assert_eq!(encode(&"y".repeat(8000), 3, 0).unwrap_err(), -1);
        assert_eq!(encode("a", 9, 0).unwrap_err(), -2);
        assert_eq!(encode("a", 1, 99).unwrap_err(), -2);
    }

    #[test]
    fn min_version_respected() {
        let (n, _) = encode("1", 0, 10).unwrap();
        assert_eq!(n, 17 + 4 * 10);
    }

    #[test]
    fn utf8_text() {
        assert!(encode("Привет, мир 🙂", 1, 0).is_ok());
    }

    #[test]
    fn ffi_roundtrip() {
        let s = "hello";
        let p = qr_alloc(s.len());
        unsafe {
            std::ptr::copy_nonoverlapping(s.as_ptr(), p, s.len());
            let n = qr_encode(p, s.len(), 1, 0);
            qr_free(p, s.len());
            assert_eq!(n, 21);
        }
        assert_eq!(qr_modules_len(), 21 * 21);
        assert!(!qr_modules().is_null());
    }
}
