;;; Javascript statement
(define-macro (!s . params) `(##inline-host-statement ,@params))

;;; Javascript expression
(define-macro (!e . params) `(##inline-host-expression ,@params))

;;; javascript expression
(define-macro (!x . params) `(##inline-host-expression ,@params))

;;; Function application helper:
(define 
  (native-params-apply init-index params) 
  (let ((sz (length params)))
    (let loop ((i init-index) (res "") (initializer ""))
      (if (= i sz) 
          res
          (loop (+ i 1) 
                (string-append 
                 res
                 initializer 
                 "g_scm2host(@" 
                 (number->string (+ i 1)) 
                 "@)")
                ",")))))

;;; Statement Apply (used to call functions as statements in a more Schemey way)
(define-macro (!sa name . args)
  (if (symbol? name) 
      `(##inline-host-statement 
        ,(string-append (symbol->string name) "(" (native-params-apply 0 args) ");") 
        ,@args)
      `(##inline-host-statement 
        ,(string-append name "(" (native-params-apply 0 args) ");") 
        ,@args)))

;;; Expression Apply (used to call javascript functions as expressions in a more Schemey way)
(define-macro (!ea name . args)
  (if (symbol? name) 
      `(##inline-host-expression 
        ,(string-append (symbol->string name) "(" (native-params-apply 0 args) ")") 
        ,@args)
      `(##inline-host-expression 
        ,(string-append name "(" (native-params-apply 0 args) ")") 
        ,@args)))

;;; Expression Apply (used to call functions as expressions in a more Schemey way)
(define-macro (!xa name . args)
  (if (symbol? name) 
      `(##inline-host-expression 
        ,(string-append (symbol->string name) "(" (native-params-apply 0 args) ")") 
        ,@args)
      `(##inline-host-expression
        ,(string-append name "(" (native-params-apply 0 args) ")") 
        ,@args)))

;;; Import macro:
(define-macro (!js-require name library)
  (let ((l (if (##symbol? library) (symbol->string library) library))
        (n (if (##symbol? name) (symbol->string name) name)))
    `(##inline-host-statement ,(string-append "/***GAMBSCRIPT-REQUIRE***/const " n " = require(\"" l "\");/***GAMBSCRIPT-REQUIRE***/"))))
