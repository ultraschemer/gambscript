(declare (standard-bindings) (extended-bindings) (not safe))

(##include "default-macros.scm")

(define-syntax cond1
  (syntax-rules (=> else)
    ((cond1 test => fun)
     (let ((exp test))
       (if exp (fun exp) #f)))
    ((cond1 test exp exp* ...)
     (if test (begin exp exp* ...)))
    ((cond1 else exp exp* ...)
     (begin exp exp* ...))))

(define (square x) (* x x))

(define-syntax swap! 
  (lambda (stx) 
    (syntax-case stx () 
      ((_ a b) 
       (syntax 
        (let ((value a)) 
          (set! a b) 
          (set! b value)))))))

(define (fib n)
    (fib-iter 1 0 n))

(define (fib-iter a b count)
  (if (= count 0)
    b
    (fib-iter (+ a b) a (- count 1))))

(!js-global "teste" 
  (lambda () (println (string-append "Function test  is here!!!"))))

(!js-global "baseTest"
  (lambda () (println (string-append "first: " "123456" "7890"))
             (println "second: 1234567890")))

(!js-global "fib" ; Javascript exported calls can't be recursive!!!!!
  (lambda (n) (fib n)))

(define GLOBAL 0)

(define (background-set! id color)
  (##inline-host-statement
   "var c = g_scm2host(@2@);  // convert Scheme string to JS
    console.log(c);"
   id
   color))

(define (setInterval callback timeout)
  (##inline-host-statement
   "var cb = g_scm2host(@1@); // convert Scheme procedure to JS
    var to = g_scm2host(@2@); // convert timeout to JS
    setInterval(cb, to);"
   callback
   timeout))

; (setInterval (let ((state #f))
;                (lambda ()
;                  (set! state (not state))
;                  (background-set! "#your-turn" (if state "lime" "white"))))
;               1000)

(define EXPORT-OBJECT (!js-object))

(!set! EXPORT-OBJECT 'testProc
  (lambda () 
    (println "All testing will be made here!!!")

    (println "Testing cond1")
    (console.log (cond1 10 => square))
    
    (println "Testing swap")
    (let ((first "first")
          (second "second"))
      (println first)
      (println second)

      (println "Now swap!")
      (swap! first second)
      (println first)
      (println second))

    (println "Test foreach (1)")
    (for-each
     (lambda (x)
       (println (fib x))) '(1 2 3 4 5 6 7 8 9 10 11 12 13 14 15))
    
    (println "Test foreach (2) and append")
    
    (for-each
       (lambda (x)
         (println (fib x)))
         (append '(1 2 3 4 5 6 7 8 9 10 11 12 13 14 15)
         '(16 17 18 19 20 21 22 23 24 25 26 27 28 29 30)))
    
    (println "Big number #1")
    (raw.console.log 123456789098765432123456789)
    
    (println "Big number #s")
    (let ((bignumber (+ 433494437 433494437)))
       (raw.console.log bignumber))
    
    (let* ((start (current-milliseconds))
           (result (fib 35))
           (end (current-milliseconds)))
      (println (fx- end start))
      (println result))

    (console.log 123456)
    (console.log "This is a scheme string!!!")
    (console.log (/ 22.22 89126478324726487238.33))
    (let ((dois 2))
      (console.log `(1 2 ,dois 3 4)))
    (raw.console.log "ESSE É UM TESTE DE STRING RAW")
    (raw.console.log '(1 2 3 4 5 6))
    
    ; (println "Testing call/cc. It must return 4:")
    ; (println (+ 1 (call/cc (lambda (k)  (+ 2 (k 3))))))
    ; (println (+ 1 (##call-with-current-continuation (lambda (k)  (+ 2 (k 3))))))
    ; (println "Call/cc tested and enabled.")

    (println "Testing direct Javascript function/methods/class calls:")
    (!sa "console.log" "Calling" "console.log" "using a " "string." "Useful" 
         "for" "eval metaprogramming" '(passing a list))
    (!sa console.log "Calling" "console.log" "directly." "Only" "macros" "for"
         "metaprogramming." "Passing" "a" "Javascript" "array"
         (!xa Array 1 2 3 4 4 5 6 6 78))
    (!sa console.log "GLOBAL: " GLOBAL)
    (let ((str (make-random-string 1000)))
      (console.log (string-append "RANDOM STRING: " str)))
    ; (define object "lalalalala")
    (let ((object (!js-object)))
      (!sa console.log "New native javascript object: " object)
      (!js-object-set! object "field1" 1)
      (!js-obj-set! object 'field2 "dois")
      (!obj-set! object "field3" 'tres)
      (!set! object 'field4 (lambda () (println "This is field 4!!!")))
      (!sa console.log "Native javascript object: " object)
      (console.log (!js-object-get object 'field1))
      (console.log (!js-obj-get object "field2"))
      (console.log (!obj-get object "field3"))
      (console.log (!get object 'field4))
      ((!js-object-get object 'field4))
      (console.log (!js-object-raw-get object 'field1))
      (console.log (!js-obj-raw-get object "field2"))
      (console.log (!obj-raw-get object "field3"))
      (console.log (!raw-get object 'field4)))

    (!js-require _ underscore)
    (!sa console.log "UNDERSCORE SIZE OF [1, 2, 3, 4]: " (!xa _.size (!xa Array 1 2 3 4)))

    (set! GLOBAL (+ 1 GLOBAL))
    (console.log GLOBAL)

    ; (let ((another-state #f))
    ;   (setInterval 
    ;      (lambda ()
    ;        (set! another-state (not another-state))
    ;        (background-set! "#your-turn" (if another-state "another-lime" "another-white")))
    ;     1000))

    ))

(!set! EXPORT-OBJECT 'variable 10)

(!js-export EXPORT-OBJECT)

