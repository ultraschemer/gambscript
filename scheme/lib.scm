(declare (standard-bindings) (extended-bindings) (not safe))

(##include "~~lib/header.scm") ; Moved from prelude to here - otherwise the build doesn't work.
(##include "~~lib/_gambit#.scm")
(##include "~~lib/_thread#.scm") ; Added these - even with these additions, call/cc doesn't work
(##include "~~lib/_syntax.scm")
(##include "~~lib/_with-syntax-boot.scm")
(##include "default-macros.scm")

;;;
;;; Call/cc Support:
;;;
(define (##call-with-current-continuation f)
  (##continuation-capture
   (lambda (k)
     (f (lambda (r) (##continuation-return-no-winding k r))))))

;;;
;;; List support:
;;;
(define (##append lst1 lst2)
  (if (pair? lst1)
      (cons (car lst1) (append (cdr lst1) lst2))
      lst2))
(define (##length lst)
  (let loop ((size 0)
             (content lst))
    (if (null? content) size (loop (+ size 1) (cdr content)))))

(define append ##append)

;;; (define (##list->vector lst) '())

;;;
;;; Quasi-quotation support:
;;;
(define (##quasi-list . lst) lst)
(define (##quasi-cons obj1 obj2) (##cons obj1 obj2))
(define (##quasi-vector . lst) (##quasi-list->vector lst))
(define (##quasi-list->vector lst)
  (##list->vector lst)) ;; need to define ##list->vector too!
(define (##quasi-append lst1 lst2)
  (##append lst1 lst2)) ;; need to define ##append too!

;;;
;;; String support:
;;;
(define (##string-append . strs)
  (let ((base-string-append 
         (lambda (str1 str2) 
           (let ((s "")) 
             (##inline-host-statement 
              "@1@.codes = @2@.codes.concat(@3@.codes);" s str1 str2)
             s))))
    (case (length strs)
      ((0)  "")
      ((1)  strs)
      ((2)  (base-string-append (car strs) (cadr strs)))
      (else (apply ##string-append 
                   (cons (base-string-append (car strs) (cadr strs)) 
                         (cddr strs)))))))

(define (##string=? str1 str2)
  (!e "P(@1@) === P(@2@)" str1 str2))

;;;
;;; Control flows:
;;;
(define (for-each f lst)
  (if (pair? lst)
      (begin
        (f (car lst))
        (for-each f (cdr lst)))))

;;;
;;; Javascript integration support
;;;
(define (current-milliseconds)
  (##inline-host-expression "Date.now()"))

(define (js-alert obj)
  (##inline-host-statement "console.log(g_scm2host(@1@));" obj))

(define (raw.console.log obj)
  (##inline-host-statement "console.log(@1@);" obj))

(define (console.log obj)
  (##inline-host-statement "console.log(g_scm2host(@1@));" obj))

(define (make-random-string strlen)
  (!e "R(makeRandomString(P(@1@)))" strlen))

;;;
;;; Explicit Javascript integration:
;;;
(define (!js-global name obj)
  (##inline-host-statement 
   "if(global) {
      global[g_scm2host(@1@)]=g_scm2host(@2@);
    } else {
      window[g_scm2host(@1@)]=g_scm2host(@2@);
    }" name obj))

(define (!raw-js-global name obj)
  (##inline-host-statement 
   "if(global) {
      global[g_scm2host(@1@)]=@2@;
    } else {
      global[g_scm2host(@1@)]=@2@;
    }
   " name obj))

(define (!js-export obj)
  (##inline-host-statement
   "(function() {
      if(global) {
        const gindex = makeRandomString(64);
        global[\"gambscript-main-\" + gindex] = g_scm2host(@2@);
        module.exports =  global[\"gambscript-main-\" + gindex];
      } else {
        const gindex = makeRandomString(64);
        window[\"gambscript-main-\" + gindex] = g_scm2host(@2@);
        module.exports =  window[\"gambscript-main-\" + gindex];
      }
    })();" name obj))

(define (!raw-js-export obj)
  (##inline-host-statement
   "(function() {
      if(global) {
        const gindex = makeRandomString(64);
        global[\"gambscript-main-\" + gindex] = @2@;
        module.exports =  global[\"gambscript-main-\" + gindex];
      } else {
        const gindex = makeRandomString(64);
        window[\"gambscript-main-\" + gindex] = @2@;
        module.exports =  window[\"gambscript-main-\" + gindex];
      }
    })();" name obj))

(define (!js-object) (!e "{}"))

(define (!js-object-set! object name value)
  (let ((n (if (##symbol? name) (symbol->string name) name))) 
    (##inline-host-statement 
     "(function() {
        const obj = @1@;
        const name = g_scm2host(@2@);
        const value = g_scm2host(@3@);
        obj[name] = value;
      })();" object n value)))
(define !js-obj-set! !js-object-set!)
(define !obj-set! !js-object-set!)
(define !set! !js-object-set!)

(define (!js-object-raw-set! object name value) 
  (let ((n (if (##symbol? name) (symbol->string name) name))) 
    (##inline-host-statement 
     "(function() {
        const obj = @1@;
        const name = g_scm2host(@2@);
        const value = @3@;
        obj[name] = value;
      })();" object n value)))
(define !js-obj-raw-set! !js-object-raw-set)
(define !obj-raw-set! !js-object-raw-set)
(define !raw-set! !js-object-raw-set)

(define (!js-object-get object name)
  (let ((n (if (##symbol? name) (symbol->string name) name)))
    (!e "g_host2scm((function(){
      const obj = @1@;
      const name = g_scm2host(@2@);
      return obj[name];
    })())" object n)))
(define !js-obj-get !js-object-get)
(define !obj-get !js-object-get)
(define !get !js-object-get)

(define (!js-object-raw-get object name)
  (let ((n (if (##symbol? name) (symbol->string name) name)))
    (!e "(function(){
      const obj = @1@;
      const name = g_scm2host(@2@);
      return obj[name];
    })()" object n)))
(define !js-obj-raw-get !js-object-raw-get)
(define !obj-raw-get !js-object-raw-get)
(define !raw-get !js-object-raw-get)

;;; Linking entry:
(app#)
